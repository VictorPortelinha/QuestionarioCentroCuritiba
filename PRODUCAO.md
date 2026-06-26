# Lançamento Público — Ajustes para ~50 usuários simultâneos

Mudanças já aplicadas no código para suportar uso público com picos de
acesso. Leia os pontos de **decisão** no fim — alguns exigem escolha sua.

---

## O que já foi configurado

### 1. Concorrência do servidor
- **Gunicorn:** 3 workers × 4 threads = até 12 requisições em paralelo
  (no `Procfile` e `nixpacks.toml`). Suficiente para 50 pessoas navegando,
  já que as requisições são curtas e espaçadas.
- **Pool MySQL:** aumentado de 5 → **16 conexões** (`DB_POOL_SIZE`,
  configurável por variável de ambiente).

### 2. Segurança para site público
- **CORS travado:** não usa mais `"*"`. Como o Flask serve o frontend
  (mesma origem), não precisa liberar nada. Se um dia separar os domínios,
  defina `ALLOWED_ORIGIN`.
- **Rate limiting** (Flask-Limiter) nas rotas sensíveis:
  - Cadastro: 10/hora por IP
  - Login: 20/hora por IP
  - Envio de resposta: 15/hora por IP
  - Limite geral: 200/hora por IP

### 3. Anti-spam ajustado para redes compartilhadas
O bloqueio por "impressão digital do dispositivo" (IP + navegador) foi
**desligado por padrão**. Motivo: numa rede compartilhada (wifi da
faculdade, internet móvel) muitas pessoas legítimas têm o **mesmo IP** —
o bloqueio barraria gente de verdade. A proteção real continua de pé:
`UNIQUE(user_id)` no banco garante **uma resposta por conta**.

---

## Pontos de DECISÃO antes de abrir ao público

### A) Rate limiting entre múltiplos workers → use Redis
Com 3 workers, o rate limit em memória conta **separado por worker**
(o limite efetivo fica ~3× maior que o configurado). Para um teste isso é
tolerável. Para valer de verdade:

1. No Railway: **+ New → Database → Add Redis**.
2. No serviço do app, adicione a variável `RATELIMIT_STORAGE_URI` como
   referência à URL do Redis (algo como `redis://default:senha@host:porta`).

Sem Redis funciona, só é menos preciso.

### B) Verificação de e-mail (recomendado, não incluído)
Hoje qualquer e-mail é aceito sem confirmação. Para uma pesquisa pública
séria, considere confirmar o e-mail (link de ativação) para evitar contas
falsas. Isso exige um serviço de envio de e-mail (ex.: Resend, SendGrid) e
não está implementado — me avise se quiser adicionar.

### C) CAPTCHA no cadastro (opcional)
Se o objetivo é impedir bots em massa, um CAPTCHA (hCaptcha/Turnstile) no
cadastro é mais eficaz que rate limit sozinho. Também não incluído.

### D) Validade dos dados da pesquisa
Como é participação pública, pense em como vai tratar:
- Respostas duplicadas da mesma pessoa com e-mails diferentes.
- Marcadores fora da área do Centro de Curitiba (dá para validar no
  backend se quiser — hoje aceita qualquer coordenada).

---

## Capacidade esperada

| Cenário | Resultado |
|---------|-----------|
| 50 pessoas navegando/marcando | Tranquilo até no trial gratuito |
| 50 envios no mesmo segundo | Pool de 16 + filas curtas dão conta; alguns esperam ms |
| Plano recomendado | Hobby (US$5) para estabilidade e sem surpresa de crédito |

---

## Antes de divulgar o link

- [ ] `JWT_SECRET` configurado (valor forte, não o padrão)
- [ ] Redis adicionado + `RATELIMIT_STORAGE_URI` (se quiser rate limit preciso)
- [ ] Testado cadastro + login + envio + bloqueio de reenvio
- [ ] Testado em celular (layout responsivo)
- [ ] Banco com backup/exportação combinada (os dados da pesquisa importam!)
- [ ] Decidido sobre verificação de e-mail / CAPTCHA
- [ ] Subido com ao menos 1 dia de antecedência para validar estabilidade
