"""Utilidades de contraseñas con hashlib de la estándar (sin dependencias extra).

Se usa PBKDF2-HMAC-SHA256 con sal aleatoria. El hash almacenado es autocontenido:
``pbkdf2_sha256$<iteraciones>$<sal_hex>$<hash_hex>``.
"""

import hashlib
import hmac
import os

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
