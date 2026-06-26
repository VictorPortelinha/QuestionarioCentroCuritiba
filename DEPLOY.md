# Deploy Rápido — Railway (< 1 hora)

Guia para colocar o PPSIG no ar para sua orientadora testar. Tudo em
**um único serviço** (Flask serve o React) + **um banco MySQL**, na Railway.

> Custo: o crédito gratuito de US$5 do primeiro mês cobre tranquilamente
> um período de testes. Não precisa de cartão para começar.

---

## Pré-requisitos
- Conta no GitHub com o projeto já enviado (você já fez isso).
- Os arquivos `Procfile`, `nixpacks.toml` e o `app.py` atualizado já estão
  no projeto (incluídos nesta versão).

---

## Passo 1 — Suba as alterações para o GitHub (5 min)

Certifique-se de que estes arquivos estão no repositório:
```
Procfile
nixpacks.toml
backend/app.py        (versão que serve o frontend)
backend/db.py         (versão que lê env vars do Railway)
```

```bash
git add .
git commit -m "Configuração de deploy (serviço único + auto-schema)"
git push
```

---

## Passo 2 — Crie o projeto na Railway (5 min)

1. Acesse **https://railway.app** e faça login com o GitHub.
2. Clique em **New Project → Deploy from GitHub repo**.
3. Selecione o repositório do PPSIG.
4. A Railway detecta o `nixpacks.toml` e começa o build (frontend + backend).
   Deixe rodando — vamos adicionar o banco em paralelo.

---

## Passo 3 — Adicione o banco MySQL (3 min)

1. Dentro do projeto, clique em **+ New → Database → Add MySQL**.
2. A Railway provisiona o MySQL e cria automaticamente as variáveis
   `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
3. O `db.py` já lê essas variáveis — **não precisa configurar nada à mão**.

---

## Passo 4 — Conecte o banco ao app (5 min)

A Railway isola variáveis por serviço. Para o app enxergar o MySQL:

1. Abra o serviço do **app** (não o do banco) → aba **Variables**.
2. Clique em **+ New Variable → Add Reference** e adicione, referenciando o
   serviço MySQL, as cinco variáveis:
   `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
3. Adicione também uma variável manual de segurança:
   - **Nome:** `JWT_SECRET`
   - **Valor:** gere com `python -c "import secrets; print(secrets.token_hex(32))"`

O app reinicia sozinho. Na primeira subida ele **cria as tabelas
automaticamente** (função `ensure_schema` no `app.py`).

---

## Passo 5 — Gere o domínio público (2 min)

1. No serviço do app → aba **Settings → Networking**.
2. Clique em **Generate Domain**.
3. A Railway devolve uma URL tipo `https://ppsig-production.up.railway.app`.

Essa é a URL que você envia para a sua orientadora.

---

## Passo 6 — Teste (5 min)

1. Acesse a URL → deve aparecer a tela de login/cadastro.
2. Cadastre um usuário de teste.
3. Responda o questionário e envie.
4. Tente enviar de novo → deve aparecer a tela "Você já participou".

Se algo falhar, veja os **logs** na aba **Deployments → View Logs** do serviço.

---

## Por que serviço único?

Servir o React pelo próprio Flask elimina:
- Configuração de CORS para domínio de produção.
- Variável `VITE_API_URL` no frontend (as chamadas `/api` são na mesma origem).
- Um segundo deploy e um segundo domínio.

O `app.py` já tem a rota catch-all que entrega o `index.html` do build e
deixa o React cuidar do roteamento interno.

---

## Alternativa sem Railway (PythonAnywhere)

Se preferir uma opção 100% gratuita e permanente para Flask + MySQL:
**PythonAnywhere** inclui MySQL no plano free. O fluxo é diferente (upload
de arquivos + console web em vez de deploy via Git), leva um pouco mais de
tempo de configuração, mas não consome créditos. Avise se quiser o passo a
passo dessa rota.

---

## Checklist antes de enviar para a orientadora

- [ ] URL abre na tela de login
- [ ] Cadastro funciona (cria usuário)
- [ ] Login funciona
- [ ] Mapa carrega e aceita marcadores
- [ ] Envio de resposta funciona
- [ ] Reenvio é bloqueado
- [ ] `JWT_SECRET` configurado (não usar o valor padrão)
