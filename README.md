# PPSIG Curitiba — Sistema Completo

> **Programa Curitiba de Volta ao Centro** — Plataforma de Participação Pública com SIG
> React (Vite) + Flask (RESTful) + MySQL · Pesquisa PIBITI / PUCPR

Sistema com **cadastro e login de usuários**, **autenticação segura** (bcrypt + JWT),
**prevenção de envios múltiplos** (anti-spam) e **persistência em MySQL**.

---

## Modelo Relacional

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│    users     │ 1     N │    responses     │ 1     N │   markers    │
├──────────────┤────────<├──────────────────┤────────<├──────────────┤
│ id (PK)      │         │ id (PK, UUID)    │         │ id (PK)      │
│ name         │         │ user_id (FK)     │         │ response_id  │
│ email (UQ)   │         │ comment          │         │ question_id  │
│ age          │         │ client_fingerprint│        │ category     │
│ password_hash│         │ ip_address       │         │ latitude     │
│ created_at   │         │ created_at       │         │ longitude    │
└──────────────┘         └──────────────────┘         │ note         │
                          UNIQUE(user_id) ← anti-spam  └──────────────┘
```

**Regras-chave:**
- `users.email` é único — não permite cadastro duplicado.
- `responses.user_id` é único — **um usuário só envia uma resposta**.
- `responses.client_fingerprint` bloqueia reenvio do mesmo dispositivo por 24h.
- `password_hash` armazena apenas o hash bcrypt (custo 12), **nunca a senha em texto**.
- Exclusão em cascata: apagar um usuário remove suas respostas e marcadores.

---

## Estrutura

```
ppsig-full/
├── database/
│   └── schema.sql          Script de criação do banco
├── backend/
│   ├── app.py              API RESTful (rotas)
│   ├── auth.py             bcrypt + JWT + decorator login_required
│   ├── db.py               pool de conexões MySQL
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx            entry (envolve em AuthProvider)
        ├── App.jsx             roteamento de telas + fluxo auth
        ├── App.css
        ├── utils/
        │   └── api.js          cliente HTTP + token JWT
        ├── hooks/
        │   ├── AuthContext.jsx estado global de autenticação
        │   └── useUMap.js      estado dos marcadores
        ├── components/         MapComponent, MarkerList, ProgressBar
        └── pages/
            ├── AuthScreen.jsx       login + cadastro
            ├── WelcomeScreen.jsx
            ├── QuestionnaireScreen.jsx
            ├── SuccessScreen.jsx
            └── AlreadyResponded.jsx  bloqueio de reenvio
```

---

## 1. Banco de Dados (MySQL)

Pré-requisito: MySQL 8.0+ instalado e rodando.

```bash
# Cria o banco e as tabelas
mysql -u root -p < database/schema.sql
```

Ou abra o `schema.sql` no MySQL Workbench e execute (▶).

Verifique:
```sql
USE ppsig_curitiba;
SHOW TABLES;   -- deve listar: users, responses, markers, v_marker_stats
```

---

## 2. Backend (Flask)

```bash
cd backend

# Ambiente virtual
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Dependências
pip install -r requirements.txt

# Configuração — copie e edite o .env
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux
```

Edite o `.env` com a senha do seu MySQL e gere uma chave JWT:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
# cole o resultado em JWT_SECRET no .env
```

> **Nota:** o `app.py` lê variáveis de ambiente. Para carregar o `.env`
> automaticamente, instale `python-dotenv` (já incluso) e adicione no topo do
> `app.py`: `from dotenv import load_dotenv; load_dotenv()` — ou defina as
> variáveis manualmente no terminal antes de rodar.

Rode:
```bash
python app.py
# → http://localhost:5000
```

Teste: `http://localhost:5000/health`

---

## 3. Frontend (Vite)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000  (proxy /api → :5000)
```

---

## Fluxo de Autenticação

1. Usuário acessa → **AuthScreen** (login ou cadastro).
2. Cadastro valida: nome, e-mail, idade (16–120), senha (mín. 8), confirmação.
3. Backend gera **hash bcrypt** da senha e retorna um **token JWT**.
4. O token é salvo no `localStorage` e enviado em `Authorization: Bearer <token>`.
5. Ao logar, o app verifica via `/api/responses/mine` se o usuário **já respondeu**:
   - Se sim → tela **AlreadyResponded** (bloqueio).
   - Se não → questionário normal.
6. No envio, o backend rejeita duplicatas (HTTP 409) e reenvios do mesmo
   dispositivo em 24h (HTTP 429).

---

## Endpoints da API

| Método | Rota | Auth | Descrição |
|--------|------|:----:|-----------|
| POST | `/api/auth/register` | — | Cadastro (name, email, age, password, confirmPassword) |
| POST | `/api/auth/login` | — | Login (email, password) → token |
| GET  | `/api/auth/me` | ✓ | Dados do usuário logado |
| GET  | `/api/questions` | — | Lista de 11 perguntas |
| GET  | `/api/responses/mine` | ✓ | Verifica se já respondeu |
| POST | `/api/responses` | ✓ | Envia resposta (1 por usuário) |
| GET  | `/api/responses/geojson` | — | Exporta marcadores como GeoJSON |
| GET  | `/api/stats` | — | Estatísticas |
| GET  | `/health` | — | Health check |

### Exemplo — cadastro

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Silva","email":"maria@email.com","age":30,"password":"senha12345","confirmPassword":"senha12345"}'
```

### Exemplo — envio de resposta (autenticado)

```bash
curl -X POST http://localhost:5000/api/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"markers":{"1":[{"lat":-25.4284,"lng":-49.2733,"note":"Paço"}]},"comment":"..."}'
```

---

## Segurança Implementada

- **Senhas:** bcrypt com salt (custo 12). O hash nunca é exposto em respostas.
- **Tokens:** JWT assinado (HS256), expira em 24h.
- **Rotas protegidas:** decorator `@login_required` valida o token.
- **Validação dupla:** front (UX) + back (autoritativa) em todos os campos.
- **Anti-spam:** UNIQUE(user_id) no banco + fingerprint de dispositivo (24h).
- **SQL injection:** todas as queries usam parâmetros (`%s`), nunca concatenação.

> ⚠️ Para produção: use HTTPS, mova o JWT para cookie `httpOnly`, configure
> CORS restrito ao domínio real e nunca versione o `.env`.

---

## Rodando tudo junto

Três componentes, na ordem:

1. **MySQL** rodando (serviço do sistema).
2. **Backend** — `cd backend && python app.py` (porta 5000).
3. **Frontend** — `cd frontend && npm run dev` (porta 3000).

Acesse **http://localhost:3000**.

---

*Projeto desenvolvido no contexto da pesquisa PIBITI — PUCPR, 2026.*
