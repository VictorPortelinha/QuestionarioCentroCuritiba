from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import uuid
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# In-memory storage for prototype (replace with DB in production)
responses_store = []

QUESTIONS = [
    # Patrimônio e Cultura
    {
        "id": 1,
        "category": "patrimonio",
        "category_label": "Patrimônio e Cultura",
        "text": "Quais prédios emblemáticos do Centro deveriam ser restaurados?",
        "max_markers": 3,
        "icon": "🏛️"
    },
    {
        "id": 2,
        "category": "patrimonio",
        "category_label": "Patrimônio e Cultura",
        "text": "Quais monumentos do Centro deveriam receber iluminação cênica?",
        "max_markers": 3,
        "icon": "💡"
    },
    {
        "id": 3,
        "category": "patrimonio",
        "category_label": "Patrimônio e Cultura",
        "text": "Quais espaços públicos (p. ex.: rua, largo, praça) do Centro deveriam receber melhorias de infraestrutura para ampliar a convivência e a oferta de atividades culturais?",
        "max_markers": 3,
        "icon": "🎭"
    },
    {
        "id": 4,
        "category": "patrimonio",
        "category_label": "Patrimônio e Cultura",
        "text": "Quais prédios do Centro deveriam receber incentivo a modernização (retrofit)?",
        "max_markers": 3,
        "icon": "🏗️"
    },
    {
        "id": 5,
        "category": "patrimonio",
        "category_label": "Patrimônio e Cultura",
        "text": "Quais locais deveriam ser priorizados para receber eventos culturais, gastronômicos e esportivos que ampliam a visibilidade do Centro?",
        "max_markers": 3,
        "icon": "🎉"
    },
    # Mobilidade e Infraestrutura
    {
        "id": 6,
        "category": "mobilidade",
        "category_label": "Mobilidade e Infraestrutura",
        "text": "Quais ruas e calçadas do Centro deveriam ser requalificadas para melhorar a circulação e a acessibilidade?",
        "max_markers": 3,
        "icon": "🚶"
    },
    {
        "id": 7,
        "category": "mobilidade",
        "category_label": "Mobilidade e Infraestrutura",
        "text": "Em quais vias do Centro deveriam ser implantadas ciclovias ou outras estruturas para bicicletas?",
        "max_markers": 3,
        "icon": "🚲"
    },
    {
        "id": 8,
        "category": "mobilidade",
        "category_label": "Mobilidade e Infraestrutura",
        "text": "Quais locais no Centro deveriam receber melhorias na iluminação pública?",
        "max_markers": 3,
        "icon": "🌙"
    },
    # Moradia e Inclusão
    {
        "id": 9,
        "category": "moradia",
        "category_label": "Moradia e Inclusão",
        "text": "Onde deveriam ser estimulados empreendimentos de Habitação de Interesse Social – HIS (voltada a população de baixa renda) no Centro?",
        "max_markers": 3,
        "icon": "🏠"
    },
    {
        "id": 10,
        "category": "moradia",
        "category_label": "Moradia e Inclusão",
        "text": "Em quais áreas do Centro deveria ser incentivada a produção de novas moradias?",
        "max_markers": 3,
        "icon": "🏘️"
    },
    # Segurança Urbana
    {
        "id": 11,
        "category": "seguranca",
        "category_label": "Segurança Urbana",
        "text": "Quais locais do Centro necessitam de ações prioritárias para melhorar a segurança pública?",
        "max_markers": 3,
        "icon": "🛡️"
    },
]

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify({
        "questions": QUESTIONS,
        "total": len(QUESTIONS)
    })

@app.route('/api/responses', methods=['POST'])
def submit_response():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    response_id = str(uuid.uuid4())
    response_entry = {
        "id": response_id,
        "timestamp": datetime.utcnow().isoformat(),
        "markers": data.get("markers", {}),
        "comment": data.get("comment", ""),
        "metadata": {
            "user_agent": request.headers.get("User-Agent", ""),
            "ip": request.remote_addr
        }
    }

    # Validate markers
    markers = data.get("markers", {})
    for q_id, marker_list in markers.items():
        q = next((q for q in QUESTIONS if str(q["id"]) == str(q_id)), None)
        if q and len(marker_list) > q["max_markers"]:
            return jsonify({"error": f"Too many markers for question {q_id}"}), 400

    responses_store.append(response_entry)

    return jsonify({
        "success": True,
        "id": response_id,
        "message": "Resposta enviada com sucesso!"
    }), 201


@app.route('/api/responses', methods=['GET'])
def get_responses():
    """Admin endpoint to view all responses"""
    return jsonify({
        "total": len(responses_store),
        "responses": responses_store
    })


@app.route('/api/responses/geojson', methods=['GET'])
def get_geojson():
    """Export all markers as GeoJSON FeatureCollection"""
    features = []
    for resp in responses_store:
        for q_id, marker_list in resp.get("markers", {}).items():
            q = next((q for q in QUESTIONS if str(q["id"]) == str(q_id)), None)
            for marker in marker_list:
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [marker["lng"], marker["lat"]]
                    },
                    "properties": {
                        "response_id": resp["id"],
                        "question_id": int(q_id),
                        "question_text": q["text"] if q else "",
                        "category": q["category"] if q else "",
                        "note": marker.get("note", ""),
                        "timestamp": resp["timestamp"]
                    }
                }
                features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    return jsonify(geojson)


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Basic stats for the dashboard"""
    total_responses = len(responses_store)
    markers_by_question = {}
    for resp in responses_store:
        for q_id, marker_list in resp.get("markers", {}).items():
            if q_id not in markers_by_question:
                markers_by_question[q_id] = 0
            markers_by_question[q_id] += len(marker_list)

    return jsonify({
        "total_responses": total_responses,
        "markers_by_question": markers_by_question
    })


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
