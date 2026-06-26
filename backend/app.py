"""
app.py — API RESTful do PPSIG Curitiba.

Endpoints:
  POST /api/auth/register   cadastro
  POST /api/auth/login      login
  GET  /api/auth/me         dados do usuário logado
  GET  /api/questions       lista de perguntas
  GET  /api/responses/mine  resposta do usuário logado (se houver)
  POST /api/responses       envia resposta (1 por usuário — anti-spam)
  GET  /api/responses/geojson  exporta marcadores (GeoJSON)
  GET  /api/stats           estatísticas
  GET  /health
"""
import os
import re
import uuid
import hashlib
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from mysql.connector import Error, IntegrityError

from db import get_connection, init_pool
from auth import (
    hash_password, verify_password, generate_token, login_required,
)

# Pasta com o build do frontend (frontend/dist). Em produção o Flask
# serve esses arquivos estáticos, então tudo roda em um só serviço.
STATIC_DIR = os.environ.get("STATIC_DIR", os.path.join(
    os.path.dirname(__file__), "..", "frontend", "dist"))

app = Flask(__name__, static_folder=None)

# Como o Flask serve o próprio frontend (mesma origem), o CORS pode ser
# restrito. Defina ALLOWED_ORIGIN nas variáveis de ambiente se o frontend
# estiver em um domínio separado; por padrão libera apenas a própria origem.
_allowed = os.environ.get("ALLOWED_ORIGIN", "")
if _allowed:
    CORS(app, resources={r"/api/*": {"origins": _allowed.split(",")}})
else:
    # mesma origem — CORS mínimo (não libera "*")
    CORS(app, resources={r"/api/*": {"origins": []}})

# ── Rate limiting (proteção contra abuso em site público) ──
# Em produção com múltiplos workers, configure RATELIMIT_STORAGE_URI
# apontando para um Redis. Sem isso, o limite é por-processo (in-memory),
# o que ainda ajuda mas não é compartilhado entre workers.
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per hour"],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

QUESTIONS = [
    {"id": 1,  "category": "patrimonio", "category_label": "Patrimônio e Cultura",        "icon": "🏛️", "text": "Quais prédios emblemáticos do Centro deveriam ser restaurados?", "max_markers": 3},
    {"id": 2,  "category": "patrimonio", "category_label": "Patrimônio e Cultura",        "icon": "💡", "text": "Quais monumentos do Centro deveriam receber iluminação cênica?", "max_markers": 3},
    {"id": 3,  "category": "patrimonio", "category_label": "Patrimônio e Cultura",        "icon": "🎭", "text": "Quais espaços públicos do Centro deveriam receber melhorias de infraestrutura para ampliar a convivência e a oferta de atividades culturais?", "max_markers": 3},
    {"id": 4,  "category": "patrimonio", "category_label": "Patrimônio e Cultura",        "icon": "🏗️", "text": "Quais prédios do Centro deveriam receber incentivo a modernização (retrofit)?", "max_markers": 3},
    {"id": 5,  "category": "patrimonio", "category_label": "Patrimônio e Cultura",        "icon": "🎉", "text": "Quais locais deveriam ser priorizados para receber eventos culturais, gastronômicos e esportivos?", "max_markers": 3},
    {"id": 6,  "category": "mobilidade", "category_label": "Mobilidade e Infraestrutura", "icon": "🚶", "text": "Quais ruas e calçadas do Centro deveriam ser requalificadas para melhorar a circulação e a acessibilidade?", "max_markers": 3},
    {"id": 7,  "category": "mobilidade", "category_label": "Mobilidade e Infraestrutura", "icon": "🚲", "text": "Em quais vias do Centro deveriam ser implantadas ciclovias ou outras estruturas para bicicletas?", "max_markers": 3},
    {"id": 8,  "category": "mobilidade", "category_label": "Mobilidade e Infraestrutura", "icon": "🌙", "text": "Quais locais no Centro deveriam receber melhorias na iluminação pública?", "max_markers": 3},
    {"id": 9,  "category": "moradia",    "category_label": "Moradia e Inclusão",          "icon": "🏠", "text": "Onde deveriam ser estimulados empreendimentos de Habitação de Interesse Social – HIS no Centro?", "max_markers": 3},
    {"id": 10, "category": "moradia",    "category_label": "Moradia e Inclusão",          "icon": "🏘️", "text": "Em quais áreas do Centro deveria ser incentivada a produção de novas moradias?", "max_markers": 3},
    {"id": 11, "category": "seguranca",  "category_label": "Segurança Urbana",            "icon": "🛡️", "text": "Quais locais do Centro necessitam de ações prioritárias para melhorar a segurança pública?", "max_markers": 3},
]

QUESTION_MAP = {q["id"]: q for q in QUESTIONS}


def client_fingerprint() -> str:
    """Impressão digital básica do cliente (IP + User-Agent) para anti-spam."""
    raw = f"{request.remote_addr}|{request.headers.get('User-Agent', '')}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ════════════════════════════════════════════════════════════════
#  AUTENTICAÇÃO
# ════════════════════════════════════════════════════════════════
@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("10 per hour")
def register():
    data = request.get_json() or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    age      = data.get("age")
    password = data.get("password") or ""
    confirm  = data.get("confirmPassword") or ""

    # ── Validações ──
    if not name or len(name) < 2:
        return jsonify({"error": "Nome inválido."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "E-mail inválido."}), 400
    try:
        age = int(age)
    except (TypeError, ValueError):
        return jsonify({"error": "Idade inválida."}), 400
    if age < 16 or age > 120:
        return jsonify({"error": "Idade deve estar entre 16 e 120 anos."}), 400
    if len(password) < 8:
        return jsonify({"error": "A senha deve ter ao menos 8 caracteres."}), 400
    if password != confirm:
        return jsonify({"error": "As senhas não conferem."}), 400

    pwd_hash = hash_password(password)

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, age, password_hash) VALUES (%s, %s, %s, %s)",
            (name, email, age, pwd_hash),
        )
        conn.commit()
        user_id = cur.lastrowid
    except IntegrityError:
        return jsonify({"error": "Este e-mail já está cadastrado."}), 409
    except Error as e:
        return jsonify({"error": f"Erro no banco: {e}"}), 500
    finally:
        conn.close()

    token = generate_token(user_id, email)
    return jsonify({
        "success": True,
        "token": token,
        "user": {"id": user_id, "name": name, "email": email, "age": age},
    }), 201


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("20 per hour")
def login():
    data = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not EMAIL_RE.match(email) or not password:
        return jsonify({"error": "Credenciais inválidas."}), 400

    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, name, email, age, password_hash FROM users WHERE email = %s",
            (email,),
        )
        user = cur.fetchone()
    finally:
        conn.close()

    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "E-mail ou senha incorretos."}), 401

    token = generate_token(user["id"], user["email"])
    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user["id"], "name": user["name"],
            "email": user["email"], "age": user["age"],
        },
    })


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, name, email, age FROM users WHERE id = %s",
            (request.user_id,),
        )
        user = cur.fetchone()
    finally:
        conn.close()
    if not user:
        return jsonify({"error": "Usuário não encontrado."}), 404
    return jsonify({"user": user})


# ════════════════════════════════════════════════════════════════
#  PERGUNTAS
# ════════════════════════════════════════════════════════════════
@app.route("/api/questions", methods=["GET"])
def get_questions():
    return jsonify({"questions": QUESTIONS, "total": len(QUESTIONS)})


# ════════════════════════════════════════════════════════════════
#  RESPOSTAS
# ════════════════════════════════════════════════════════════════
@app.route("/api/responses/mine", methods=["GET"])
@login_required
def my_response():
    """Retorna se o usuário já respondeu (para bloquear reenvio no front)."""
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(
            "SELECT id, comment, created_at FROM responses WHERE user_id = %s",
            (request.user_id,),
        )
        resp = cur.fetchone()
    finally:
        conn.close()
    return jsonify({"has_responded": resp is not None, "response": resp})


@app.route("/api/responses", methods=["POST"])
@limiter.limit("15 per hour")
@login_required
def submit_response():
    data = request.get_json() or {}
    markers = data.get("markers", {})
    comment = (data.get("comment") or "")[:600]

    # ── Validação dos marcadores ──
    if not isinstance(markers, dict):
        return jsonify({"error": "Formato de marcadores inválido."}), 400

    total = 0
    for q_id, marker_list in markers.items():
        q = QUESTION_MAP.get(int(q_id))
        if not q:
            return jsonify({"error": f"Pergunta {q_id} inexistente."}), 400
        if len(marker_list) > q["max_markers"]:
            return jsonify({"error": f"Excedeu o limite na pergunta {q_id}."}), 400
        total += len(marker_list)

    if total == 0:
        return jsonify({"error": "Marque ao menos um local antes de enviar."}), 400

    response_id = str(uuid.uuid4())
    fingerprint = client_fingerprint()

    conn = get_connection()
    try:
        cur = conn.cursor()

        # ── Anti-spam camada 1: 1 resposta por usuário (UNIQUE no banco) ──
        cur.execute("SELECT id FROM responses WHERE user_id = %s", (request.user_id,))
        if cur.fetchone():
            return jsonify({"error": "Você já enviou uma resposta."}), 409

        # ── Anti-spam camada 2 (OPCIONAL): bloqueio por dispositivo ──
        # ATENÇÃO: em redes compartilhadas (wifi de faculdade, NAT de
        # operadora móvel) várias pessoas legítimas têm o MESMO IP. Por isso
        # este bloqueio fica DESLIGADO por padrão. Ative só se entender o
        # trade-off, definindo ENABLE_FINGERPRINT_BLOCK=1.
        if os.environ.get("ENABLE_FINGERPRINT_BLOCK") == "1":
            cur.execute(
                """SELECT id FROM responses
                   WHERE client_fingerprint = %s
                     AND created_at > (NOW() - INTERVAL 24 HOUR)""",
                (fingerprint,),
            )
            if cur.fetchone():
                return jsonify({
                    "error": "Uma resposta já foi enviada deste dispositivo recentemente."
                }), 429

        # ── Insere resposta ──
        cur.execute(
            """INSERT INTO responses
               (id, user_id, comment, client_fingerprint, ip_address, user_agent)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (response_id, request.user_id, comment, fingerprint,
             request.remote_addr, request.headers.get("User-Agent", "")[:255]),
        )

        # ── Insere marcadores ──
        for q_id, marker_list in markers.items():
            q = QUESTION_MAP.get(int(q_id))
            for m in marker_list:
                cur.execute(
                    """INSERT INTO markers
                       (response_id, question_id, category, latitude, longitude, note)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (response_id, int(q_id), q["category"],
                     m["lat"], m["lng"], (m.get("note") or "")[:200]),
                )

        conn.commit()
    except IntegrityError:
        conn.rollback()
        return jsonify({"error": "Você já enviou uma resposta."}), 409
    except Error as e:
        conn.rollback()
        return jsonify({"error": f"Erro no banco: {e}"}), 500
    finally:
        conn.close()

    return jsonify({
        "success": True,
        "id": response_id,
        "message": "Resposta enviada com sucesso!",
    }), 201


@app.route("/api/responses/geojson", methods=["GET"])
def geojson():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM markers")
        rows = cur.fetchall()
    finally:
        conn.close()

    features = []
    for r in rows:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(r["longitude"]), float(r["latitude"])],
            },
            "properties": {
                "response_id": r["response_id"],
                "question_id": r["question_id"],
                "category": r["category"],
                "note": r["note"],
            },
        })
    return jsonify({"type": "FeatureCollection", "features": features})


@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT COUNT(*) AS total FROM responses")
        total_resp = cur.fetchone()["total"]
        cur.execute(
            "SELECT question_id, COUNT(*) AS c FROM markers GROUP BY question_id"
        )
        by_q = {str(r["question_id"]): r["c"] for r in cur.fetchall()}
    finally:
        conn.close()
    return jsonify({"total_responses": total_resp, "markers_by_question": by_q})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


# ════════════════════════════════════════════════════════════════
#  FRONTEND (SPA) — serve o build do React em produção
# ════════════════════════════════════════════════════════════════
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    full = os.path.join(STATIC_DIR, path)
    if path and os.path.exists(full) and os.path.isfile(full):
        return send_from_directory(STATIC_DIR, path)
    # Qualquer outra rota devolve o index.html (roteamento do React)
    return send_from_directory(STATIC_DIR, "index.html")


# ════════════════════════════════════════════════════════════════
#  BOOTSTRAP — cria as tabelas automaticamente na primeira execução
# ════════════════════════════════════════════════════════════════
def ensure_schema():
    """Cria as tabelas se ainda não existirem (idempotente)."""
    ddl = """
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL,
      age TINYINT UNSIGNED NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_users_email UNIQUE (email)
    ) ENGINE=InnoDB;
    """
    ddl2 = """
    CREATE TABLE IF NOT EXISTS responses (
      id CHAR(36) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      comment VARCHAR(600) DEFAULT NULL,
      client_fingerprint VARCHAR(64) DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_responses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT uq_responses_user UNIQUE (user_id)
    ) ENGINE=InnoDB;
    """
    ddl3 = """
    CREATE TABLE IF NOT EXISTS markers (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      response_id CHAR(36) NOT NULL,
      question_id TINYINT UNSIGNED NOT NULL,
      category VARCHAR(20) NOT NULL,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      note VARCHAR(200) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_markers_response FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      INDEX idx_markers_question (question_id),
      INDEX idx_markers_category (category)
    ) ENGINE=InnoDB;
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        for stmt in (ddl, ddl2, ddl3):
            cur.execute(stmt)
        conn.commit()
        conn.close()
        print("[bootstrap] Schema verificado/criado.")
    except Exception as e:
        print(f"[bootstrap] Falha ao criar schema: {e}")


# Inicializa pool + schema ao importar (funciona sob gunicorn também)
try:
    init_pool()
    ensure_schema()
except Exception as e:
    print(f"[startup] Banco indisponível no boot: {e}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
