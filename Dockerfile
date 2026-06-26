# ════════════════════════════════════════════════════════════════
#  Dockerfile — PPSIG Curitiba (serviço único: Flask serve o React)
#  Estágio 1: compila o frontend (Vite)
#  Estágio 2: instala o backend e serve tudo via gunicorn
# ════════════════════════════════════════════════════════════════

# ─── Estágio 1: build do frontend ───────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend

# Instala dependências (cache eficiente: copia só o manifesto primeiro)
COPY frontend/package.json ./
RUN npm install

# Copia o restante do frontend e gera o build de produção (frontend/dist)
COPY frontend/ ./
RUN npm run build


# ─── Estágio 2: backend + arquivos estáticos ────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Dependências do backend
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Código do backend
COPY backend/ ./backend/

# Build do frontend vindo do estágio 1 (Flask procura em ../frontend/dist)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# O Railway injeta a porta em $PORT
ENV PORT=8080
EXPOSE 8080

# Inicia o servidor (3 workers × 4 threads)
CMD ["sh", "-c", "cd backend && gunicorn app:app --bind 0.0.0.0:$PORT --workers 3 --threads 4 --timeout 60"]
