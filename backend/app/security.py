"""Utilidades de contraseñas con hashlib de la estándar (sin dependencias extra).

Se usa PBKDF2-HMAC-SHA256 con sal aleatoria. El hash almacenado es autocontenido:
``pbkdf2_sha256$<iteraciones>$<sal_hex>$<hash_hex>``.
"""

import base64
import binascii
import hashlib
import hmac
import json
import os
import time

from app.config import get_settings

ITERACIONES = 260_000
_SAL_BYTES = 16


def hash_password(password: str) -> str:
    """Deriva un hash con sal aleatoria listo para almacenar."""
    salt = os.urandom(_SAL_BYTES)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERACIONES)
    return f"pbkdf2_sha256${ITERACIONES}${salt.hex()}${dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica una contraseña contra un hash almacenado de forma constante en tiempo."""
    try:
        _prefijo, iteraciones_str, salt_hex, hash_hex = password_hash.split("$")
        iteraciones = int(iteraciones_str)
        salt = bytes.fromhex(salt_hex)
        esperado = bytes.fromhex(hash_hex)
    except (ValueError, AttributeError):
        return False

    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iteraciones
    )
    return hmac.compare_digest(dk, esperado)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    relleno = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + relleno)


def crear_token(usuario_id: int, rol: str) -> str:
    """Crea un token firmado con expiración (HMAC-SHA256, sin dependencias)."""
    settings = get_settings()
    payload = {
        "sub": usuario_id,
        "rol": rol,
        "exp": int(time.time()) + settings.TOKEN_EXPIRACION_HORAS * 3600,
    }
    payload_b64 = _b64url_encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    firma = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload_b64}.{_b64url_encode(firma)}"


def verificar_token(token: str) -> dict | None:
    """Valida la firma y la expiración del token. Devuelve el payload o None."""
    try:
        payload_b64, firma_b64 = token.split(".", 1)
        firma_esperada = hmac.new(
            get_settings().SECRET_KEY.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_b64url_decode(firma_b64), firma_esperada):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError, binascii.Error):
        return None
