"""
db.py — Conexão com MySQL usando pool de conexões.

Aceita variáveis no padrão local (DB_HOST...) e também no padrão que o
Railway injeta automaticamente (MYSQLHOST, MYSQLPORT, MYSQLUSER...).
"""
import os
from mysql.connector import pooling

def _cfg(*names, default=None):
    """Retorna o primeiro env var encontrado dentre os nomes dados."""
    for n in names:
        v = os.environ.get(n)
        if v:
            return v
    return default

DB_CONFIG = {
    "host":     _cfg("DB_HOST", "MYSQLHOST", default="localhost"),
    "port":     int(_cfg("DB_PORT", "MYSQLPORT", default="3306")),
    "user":     _cfg("DB_USER", "MYSQLUSER", default="root"),
    "password": _cfg("DB_PASSWORD", "MYSQLPASSWORD", default=""),
    "database": _cfg("DB_NAME", "MYSQLDATABASE", default="ppsig_curitiba"),
}

_pool = None

POOL_SIZE = int(os.environ.get("DB_POOL_SIZE", "16"))


def init_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="ppsig_pool",
            pool_size=POOL_SIZE,
            pool_reset_session=True,
            **DB_CONFIG,
        )
    return _pool


def get_connection():
    if _pool is None:
        init_pool()
    return _pool.get_connection()
