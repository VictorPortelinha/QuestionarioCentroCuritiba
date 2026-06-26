"""
auth.py — Hashing de senhas (bcrypt) e tokens de sessão (JWT).
"""
import os
import datetime
import functools
import bcrypt
import jwt
from flask import request, jsonify

JWT_SECRET = os.environ.get("JWT_SECRET", "troque-esta-chave-em-producao")
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 24


# ─── Senhas ──────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    """Gera hash bcrypt da senha. Nunca armazena texto puro."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ─── Tokens JWT ──────────────────────────────────────────────────
def generate_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return {"error": "expired"}
    except jwt.InvalidTokenError:
        return {"error": "invalid"}


# ─── Decorator de rota protegida ─────────────────────────────────
def login_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token ausente"}), 401

        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if "error" in payload:
            msg = "Token expirado" if payload["error"] == "expired" else "Token inválido"
            return jsonify({"error": msg}), 401

        # injeta dados do usuário autenticado
        request.user_id = payload["user_id"]
        request.user_email = payload["email"]
        return f(*args, **kwargs)

    return wrapper
