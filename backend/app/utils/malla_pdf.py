"""Generación del PDF vectorial de la malla horaria semanal.

El documento se arma con reportlab (canvas), de modo que el resultado es
totalmente vectorial: el texto queda seleccionable y el archivo es liviano.

El módulo es autocontenido (no toca la base de datos) porque recibe la malla
ya resuelta desde el frontend, que es la misma que se dibuja en pantalla.

Nota de unidades: reportlab trabaja en puntos (1/72 de pulgada). Todas las
medidas de la maqueta se escriben en milímetros y se convierten con `_mm`.
"""

from __future__ import annotations

import re
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from unicodedata import normalize

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm as _mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

# --- Días y franjas horarias (deben coincidir con el frontend) ---
DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
HORAS_BASE = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00",
]
HORA_INICIO_BASE = 6 * 60
TOTAL_MINUTOS = len(HORAS_BASE) * 60

# --- Paleta institucional Uninúñez ---
BRAND_50 = colors.HexColor("#fff7ed")
BRAND_200 = colors.HexColor("#fad3a0")
BRAND_600 = colors.HexColor("#f07e10")
BRAND_800 = colors.HexColor("#8c4503")
BRAND_900 = colors.HexColor("#6e3603")
UN_TEAL = colors.HexColor("#249a8c")
INFO_BG = colors.HexColor("#eaf6f5")
INFO_BORDER = colors.HexColor("#b9e3df")
INFO_TEXT = colors.HexColor("#1b7268")
INK = colors.HexColor("#3c3c3b")
MUTED = colors.HexColor("#575756")
FAINT = colors.HexColor("#8a8a89")
LINE = colors.HexColor("#e4e3e2")
LINE_STRONG = colors.HexColor("#c9c8c7")
CANVAS_BG = colors.HexColor("#f6f6f5")

# --- Geometría de la página (A4 apaisada: 297 x 210 mm) ---
MARGEN_IZQ = 12 * _mm
MARGEN_DER = 12 * _mm
MARGEN_SUP = 12 * _mm
MARGEN_INF = 12 * _mm
ANCHO_COL_HORA = 20 * _mm
ALTO_TITULO = 30 * _mm
ALTO_LEYENDA = 7 * _mm
ALTO_CABECERA_DIAS = 7 * _mm
ALTO_PIE = 8 * _mm

FUENTE = "Helvetica"
FUENTE_BOLD = "Helvetica-Bold"

NOMBRE_PREDETERMINADO = "malla-horaria"


# --------------------------------------------------------------------------
# Utilidades de texto
# --------------------------------------------------------------------------

def _sin_acentos(texto: str) -> str:
    """Elimina tildes para comparar días de forma tolerante."""
    return normalize("NFD", texto or "").encode("ascii", "ignore").decode("ascii")


def _recortar(texto: str, ancho_max: float, fuente: str, tamano: float) -> str:
    """Recorta un texto a una sola línea que quepa en `ancho_max`."""
    limpio = " ".join((texto or "").split())
    if not limpio:
        return ""
    if pdfmetrics.stringWidth(limpio, fuente, tamano) <= ancho_max:
        return limpio

    linea = ""
    for palabra in limpio.split(" "):
        candidata = f"{linea} {palabra}".strip()
        if pdfmetrics.stringWidth(f"{candidata}...", fuente, tamano) <= ancho_max:
            linea = candidata
        else:
            break
    return f"{linea}..." if linea else "..."


def sanitizar_nombre_archivo(nombre: Optional[str]) -> str:
    """Deja un nombre de archivo seguro para la cabecera Content-Disposition."""
    base = (nombre or NOMBRE_PREDETERMINADO).strip()
    base = _sin_acentos(base)
    base = re.sub(r"[^A-Za-z0-9_\-]+", "-", base).strip("-")
    return (base or NOMBRE_PREDETERMINADO)[:80]


# --------------------------------------------------------------------------
# Normalización de los bloques horario
# --------------------------------------------------------------------------

def _hora_a_minutos(hora: str) -> int:
    if not hora or ":" not in hora:
        return 0
    partes = hora.strip().split(":")
    try:
        return int(partes[0]) * 60 + int(partes[1] or 0)
    except (ValueError, IndexError):
        return 0


def _rango_horario(bloque: str) -> Tuple[int, int]:
    """Devuelve (minuto_inicio, minuto_fin) de un bloque tipo '08:00-10:00'."""
    if not bloque or "-" not in bloque:
        return HORA_INICIO_BASE, HORA_INICIO_BASE + 60
    inicio, _, fin = bloque.partition("-")
    min_inicio = _hora_a_minutos(inicio)
    min_fin = _hora_a_minutos(fin)
    if min_fin <= min_inicio:
        min_fin = min_inicio + 60
    return min_inicio, min_fin


def _es_administrativo(item: Dict[str, Any]) -> bool:
    tipo = str(item.get("tipo_actividad") or item.get("tipo") or "").upper()
    if "ADMIN" in tipo:
        return True
    bandera = item.get("es_administrativa")
    if isinstance(bandera, bool):
        return bandera
    if isinstance(bandera, (int, float)):
        return bandera == 1
    return str(bandera).strip().lower() == "true"


def _normalizar(item: Any) -> Optional[Dict[str, Any]]:
    """Normaliza un bloque horario con los mismos fallbacks que usa el frontend."""
    if not isinstance(item, dict):
        return None

    bloque = str(
        item.get("bloque_horario")
        or item.get("bloque")
        or item.get("hora")
        or item.get("horario")
        or ""
    ).strip()

    return {
        "bloque": bloque,
        "dia": str(item.get("dia") or "").strip(),
        "asignatura": str(item.get("asignatura") or item.get("materia") or "").strip(),
        "grupo": str(item.get("grupo_codigo") or item.get("grupo") or "N/A").strip(),
        "docente": str(item.get("docente_nombre") or item.get("docente") or "N/A").strip(),
        "salon": str(item.get("salon_nombre") or item.get("salon") or "Sin salón").strip(),
        "actividad": str(item.get("actividad") or "").strip(),
        "es_admin": _es_administrativo(item),
    }


def _etiquetas_sesion(bloques: List[Dict[str, Any]]) -> Dict[int, str]:
    """Calcula las etiquetas '1/2', '2/2' agrupando por asignatura + grupo."""
    conteo: Dict[str, int] = {}
    for bloque in bloques:
        if bloque["es_admin"]:
            continue
        clave = f"{bloque['asignatura']}|{bloque['grupo']}"
        conteo[clave] = conteo.get(clave, 0) + 1

    etiquetas: Dict[int, str] = {}
    vistos: Dict[str, int] = {}
    for indice, bloque in enumerate(bloques):
        if bloque["es_admin"]:
            continue
        clave = f"{bloque['asignatura']}|{bloque['grupo']}"
        vistos[clave] = vistos.get(clave, 0) + 1
        etiquetas[indice] = f"{vistos[clave]}/{conteo[clave]}"
    return etiquetas


# --------------------------------------------------------------------------
# Dibujo
# --------------------------------------------------------------------------

def _dibujar_chip(
    c: "canvas.Canvas",
    x: float,
    y: float,
    color: colors.Color,
    etiqueta: str,
    fuente: str = FUENTE,
    tamano: float = 6.5,
) -> float:
    """Dibuja un cuadrado de color con su etiqueta y devuelve el ancho usado."""
    c.setFillColor(color)
    c.setStrokeColor(LINE_STRONG)
    c.setLineWidth(0.3)
    c.rect(x, y, 2.6 * _mm, 2.6 * _mm, stroke=1, fill=1)
    c.setFont(fuente, tamano)
    c.setFillColor(MUTED)
    c.drawString(x + 3.8 * _mm, y + 0.7 * _mm, etiqueta)
    return 3.8 * _mm + pdfmetrics.stringWidth(etiqueta, fuente, tamano)


def _dibujar_encabezado(
    c: "canvas.Canvas",
    titulo: str,
    subtitulo: Optional[str],
    izquierda: float,
    derecha: float,
    y: float,
) -> None:
    c.setFont(FUENTE_BOLD, 15)
    c.setFillColor(INK)
    c.drawString(izquierda, y - 10.5 * _mm, titulo)

    if subtitulo:
        c.setFont(FUENTE, 9)
        c.setFillColor(MUTED)
        c.drawString(
            izquierda,
            y - 18.5 * _mm,
            _recortar(subtitulo, derecha - izquierda - 95 * _mm, FUENTE, 9),
        )

    c.setFont(FUENTE_BOLD, 8.5)
    c.setFillColor(BRAND_800)
    c.drawRightString(derecha, y - 10.5 * _mm, "Optimizador de Horarios")
    c.setFont(FUENTE, 7)
    c.setFillColor(FAINT)
    c.drawRightString(derecha, y - 17.5 * _mm, "Uninúñez · Proyecto de Grado 2026")


def _dibujar_leyenda(c: "canvas.Canvas", x: float, y: float) -> None:
    usado = _dibujar_chip(c, x, y, BRAND_50, "Clase / asignatura")
    _dibujar_chip(c, x + usado + 6 * _mm, y, INFO_BG, "Labor administrativa")


def _dibujar_tarjeta(
    c: "canvas.Canvas",
    bloque: Dict[str, Any],
    sesion: Optional[str],
    x: float,
    y: float,
    ancho: float,
    alto: float,
) -> None:
    """Dibuja una tarjeta de bloque horario dentro de su celda.

    La cantidad de líneas visibles depende del alto disponible: los bloques de
    una hora solo alcanzan para el grupo y la asignatura, mientras que los de
    dos o más horas muestran además el salón y el docente.
    """
    es_admin = bloque["es_admin"]
    fondo = INFO_BG if es_admin else BRAND_50
    borde = INFO_BORDER if es_admin else BRAND_200
    acento = UN_TEAL if es_admin else BRAND_600
    texto_principal = INFO_TEXT if es_admin else INK
    texto_secundario = INFO_TEXT if es_admin else MUTED
    fondo_badge = INFO_BORDER if es_admin else BRAND_200
    texto_badge = INFO_TEXT if es_admin else BRAND_900

    # Cuerpo de la tarjeta
    c.setFillColor(fondo)
    c.setStrokeColor(borde)
    c.setLineWidth(0.3)
    c.roundRect(x, y, ancho, alto, 0.8 * _mm, stroke=1, fill=1)

    # Barra de acento lateral
    c.setFillColor(acento)
    c.rect(x, y, 0.9 * _mm, alto, stroke=0, fill=1)

    pad = 1.3 * _mm
    disponible = alto - 2 * pad
    ancho_util = ancho - pad * 2 - 0.9 * _mm
    if ancho_util <= 6 * _mm or disponible <= 1.5 * _mm:
        return

    # Cuántas líneas caben y con qué separación
    if disponible >= 10.5 * _mm:
        lineas = 4
    elif disponible >= 6.6 * _mm:
        lineas = 3
    elif disponible >= 3.9 * _mm:
        lineas = 2
    else:
        lineas = 1

    fs_badge = 5.5
    fs_asig = 6.5 if lineas >= 3 else 6.0
    fs_det = 5.5 if lineas >= 3 else 5.0

    if lineas == 4:
        gaps = [2.3 * _mm, 2.4 * _mm, 2.3 * _mm]
    elif lineas == 3:
        gaps = [2.4 * _mm, 2.5 * _mm]
    elif lineas == 2:
        gaps = [2.7 * _mm]
    else:
        gaps = []

    # Si sobra espacio se reparte entre las separaciones (con tope para que
    # las líneas no queden dispersas dentro de bloques muy largos).
    base = 1.35 * _mm + sum(gaps) + 1.1 * _mm
    if gaps:
        holgura = min(max(0.0, disponible - base) / len(gaps), 1.2 * _mm)
        gaps = [separacion + holgura for separacion in gaps]

    x_texto = x + pad + 0.9 * _mm
    y_linea = y + alto - pad - 1.35 * _mm

    # Línea 1: grupo/sesión (o "Admin") y bloque horario
    etiqueta = "Admin" if es_admin else f"G: {bloque['grupo']}"
    if not es_admin and sesion:
        etiqueta = f"{etiqueta} · {sesion}"

    c.setFont(FUENTE_BOLD, fs_badge)
    ancho_badge = pdfmetrics.stringWidth(etiqueta, FUENTE_BOLD, fs_badge) + 1.6 * _mm
    c.setFillColor(fondo_badge)
    c.rect(x_texto, y_linea - 0.35 * _mm, ancho_badge, 2.3 * _mm, stroke=0, fill=1)
    c.setFillColor(texto_badge)
    c.drawString(x_texto + 0.8 * _mm, y_linea, etiqueta)

    if bloque["bloque"]:
        c.setFont(FUENTE, fs_badge)
        c.setFillColor(texto_secundario)
        ancho_bloque = pdfmetrics.stringWidth(bloque["bloque"], FUENTE, fs_badge)
        if ancho_badge + ancho_bloque + 2 * _mm < ancho_util:
            c.drawRightString(x + ancho - pad, y_linea, bloque["bloque"])

    if lineas == 1:
        return

    # Línea 2: asignatura
    y_linea -= gaps[0]
    nombre = bloque["actividad"] if (es_admin and bloque["actividad"]) else bloque["asignatura"]
    if not nombre:
        nombre = "Labor administrativa" if es_admin else "Sin asignatura"
    c.setFont(FUENTE_BOLD, fs_asig)
    c.setFillColor(texto_principal)
    c.drawString(
        x_texto,
        y_linea,
        _recortar(nombre, ancho_util, FUENTE_BOLD, fs_asig),
    )

    if lineas == 2:
        return

    c.setFont(FUENTE, fs_det)
    c.setFillColor(texto_secundario)

    if lineas == 3:
        # Salón y docente en una sola línea
        y_linea -= gaps[1]
        c.drawString(
            x_texto,
            y_linea,
            _recortar(f"Salón: {bloque['salon']} · {bloque['docente']}", ancho_util, FUENTE, fs_det),
        )
        return

    # Línea 3: salón
    y_linea -= gaps[1]
    c.drawString(
        x_texto,
        y_linea,
        _recortar(f"Salón: {bloque['salon']}", ancho_util, FUENTE, fs_det),
    )

    # Línea 4: docente
    y_linea -= gaps[2]
    c.drawString(
        x_texto,
        y_linea,
        _recortar(f"Doc: {bloque['docente']}", ancho_util, FUENTE, fs_det),
    )


def generar_pdf_malla(
    horarios: List[Dict[str, Any]],
    titulo: str = "Malla horaria semanal",
    subtitulo: Optional[str] = None,
) -> bytes:
    """Arma el PDF de la malla horaria y devuelve los bytes del documento."""
    ancho_pagina, alto_pagina = landscape(A4)

    izquierda = MARGEN_IZQ
    derecha = ancho_pagina - MARGEN_DER
    ancho_rejilla = derecha - izquierda

    top_rejilla = alto_pagina - MARGEN_SUP - ALTO_TITULO - ALTO_LEYENDA - ALTO_CABECERA_DIAS
    bottom_rejilla = MARGEN_INF + ALTO_PIE
    alto_rejilla = top_rejilla - bottom_rejilla

    ancho_columna = (ancho_rejilla - ANCHO_COL_HORA) / len(DIAS)
    mm_por_minuto = alto_rejilla / TOTAL_MINUTOS

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    c.setTitle(titulo)
    c.setAuthor("Optimizador de Horarios · Uninúñez")
    c.setSubject("Malla horaria semanal")

    # --- Encabezado ---
    _dibujar_encabezado(
        c,
        titulo,
        subtitulo,
        izquierda,
        derecha,
        alto_pagina - MARGEN_SUP,
    )
    _dibujar_leyenda(
        c,
        izquierda,
        alto_pagina - MARGEN_SUP - 25.5 * _mm,
    )

    # --- Banda con los nombres de los días ---
    y_banda = top_rejilla
    c.setFillColor(INK)
    c.rect(izquierda, y_banda, ancho_rejilla, ALTO_CABECERA_DIAS, stroke=0, fill=1)

    c.setFont(FUENTE_BOLD, 6.5)
    c.setFillColor(colors.white)
    c.drawRightString(
        izquierda + ANCHO_COL_HORA - 2 * _mm,
        y_banda + 2.2 * _mm,
        "HORA",
    )
    for indice, dia in enumerate(DIAS):
        x_centro = izquierda + ANCHO_COL_HORA + indice * ancho_columna + ancho_columna / 2
        c.drawCentredString(x_centro, y_banda + 2.2 * _mm, dia.upper())

    # --- Fondo de la rejilla ---
    c.setFillColor(colors.white)
    c.rect(izquierda, bottom_rejilla, ancho_rejilla, alto_rejilla, stroke=0, fill=1)

    # Columna de las horas
    c.setFillColor(CANVAS_BG)
    c.rect(
        izquierda,
        bottom_rejilla,
        ANCHO_COL_HORA,
        alto_rejilla,
        stroke=0,
        fill=1,
    )

    # --- Guías horizontales (una por hora) ---
    c.setStrokeColor(LINE)
    c.setLineWidth(0.3)
    c.setDash(1.2 * _mm, 1.6 * _mm)
    for indice, _hora in enumerate(HORAS_BASE):
        y_linea = top_rejilla - (indice + 1) * 60 * mm_por_minuto
        c.line(izquierda, y_linea, derecha, y_linea)
    c.setDash()

    # Etiquetas de hora
    c.setFont(FUENTE, 6.5)
    c.setFillColor(FAINT)
    for indice, hora in enumerate(HORAS_BASE):
        y_hora = top_rejilla - indice * 60 * mm_por_minuto
        c.drawRightString(izquierda + ANCHO_COL_HORA - 2 * _mm, y_hora - 2.2 * _mm, hora)

    # --- Separadores verticales de los días ---
    c.setStrokeColor(LINE)
    c.setLineWidth(0.35)
    for indice in range(len(DIAS) + 1):
        x_linea = izquierda + ANCHO_COL_HORA + indice * ancho_columna
        if indice == len(DIAS):
            x_linea = derecha
        c.line(x_linea, bottom_rejilla, x_linea, top_rejilla)

    # --- Tarjetas ---
    bloques: List[Dict[str, Any]] = []
    for item in horarios or []:
        normalizado = _normalizar(item)
        if normalizado:
            bloques.append(normalizado)

    etiquetas = _etiquetas_sesion(bloques)

    for indice, bloque in enumerate(bloques):
        dia_normalizado = _sin_acentos(bloque["dia"]).strip().lower()
        columna = next(
            (
                i
                for i, dia in enumerate(DIAS)
                if _sin_acentos(dia).strip().lower() == dia_normalizado
            ),
            None,
        )
        if columna is None:
            continue

        min_inicio, min_fin = _rango_horario(bloque["bloque"])
        if min_fin <= HORA_INICIO_BASE:
            continue

        x_columna = izquierda + ANCHO_COL_HORA + columna * ancho_columna
        y_tarjeta = top_rejilla - (min_fin - HORA_INICIO_BASE) * mm_por_minuto
        alto_tarjeta = (min_fin - min_inicio) * mm_por_minuto
        if alto_tarjeta < 4 * _mm:
            continue

        _dibujar_tarjeta(
            c,
            bloque,
            etiquetas.get(indice),
            x_columna + 0.8 * _mm,
            y_tarjeta + 0.5 * _mm,
            ancho_columna - 1.6 * _mm,
            alto_tarjeta - 1.0 * _mm,
        )

    # --- Marco de la rejilla ---
    c.setStrokeColor(LINE_STRONG)
    c.setLineWidth(0.5)
    c.rect(izquierda, bottom_rejilla, ancho_rejilla, alto_rejilla, stroke=1, fill=0)

    # --- Pie de página ---
    c.setFont(FUENTE, 6.5)
    c.setFillColor(FAINT)
    c.drawString(
        izquierda,
        MARGEN_INF - 2 * _mm,
        f"Generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}",
    )
    c.drawRightString(derecha, MARGEN_INF - 2 * _mm, "Optimizador de Horarios · Uninúñez")

    c.showPage()
    c.save()
    return buffer.getvalue()
