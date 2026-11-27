# SFL — Plataforma de campeonatos

Hub de campeonatos: classificação, calendário, elencos, estatísticas e súmula ao vivo.

Stack: **Next.js** (`frontend/`) + **Fastify/Prisma** (`backend/`) + **Postgres** (Docker, porta host `5434`).

## Subir local

```bash
# 1) Banco
docker compose up -d postgres

# 2) API
cd backend
cp .env.example .env   # se ainda não tiver
npm i
npx prisma migrate deploy
npm run import:prod    # opcional: dados de produção (precisa .env.import)
npm run seed:admin
npm run dev            # http://127.0.0.1:4006

# 3) Frontend
cd ../frontend
cp .env.local.example .env.local   # se ainda não tiver
npm i
npm run dev            # http://127.0.0.1:3000
```

| O quê | URL |
|---|---|
| Site | http://127.0.0.1:3000 |
| API health | http://127.0.0.1:4006/health |
| Login Master | http://127.0.0.1:3000/master/login |
| Login Time | http://127.0.0.1:3000/time/login |
| Painel Master | http://127.0.0.1:3000/admin |
| Painel do time | http://127.0.0.1:3000/capitao |

ACL: Master = `owner` / `league_admin` (e bootstrap `admin`). Time = `team_staff` / `captain` no time concedido.

O Next reescreve `/api/*` para a API (`NEXT_PUBLIC_API_URL`, padrão `http://127.0.0.1:4006`).

## Importação de produção

Copie `.env.import.example` → `backend/.env.import` e rode `npm run import:prod` na pasta `backend/`.

## Deploy Render (plano barato)

Blueprint em `render.yaml` (~US$20/mês: 2× Starter + Postgres basic-256mb):

1. No [Render](https://dashboard.render.com): **New → Blueprint** → repo `itsbortotti/plataforma-campeonatos`.
2. Aprovar o sync (serviços `sfl-api`, `sfl-web`, DB `sfl-db`).
3. Após o deploy: URLs `https://sfl-web…onrender.com` e `https://sfl-api…onrender.com`.
4. Defina `SEED_ADMIN_USER` e `SEED_ADMIN_PASSWORD` no serviço `sfl-api` (não versionar a senha).
5. Domínio próprio: no serviço `sfl-web` → Custom Domain → na Hostinger, CNAME para o host do Render.

## Mensalidades (Asaas)

A tela fica em `/admin/mensalidades`. Sem `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `ASAAS_ENV` no serviço `sfl-api`, a cobrança fica desligada e o restante do site não muda.

1. Crie a conta em [asaas.com](https://www.asaas.com) (sandbox primeiro: [sandbox.asaas.com](https://sandbox.asaas.com)) no CPF ou CNPJ de quem recebe.
2. Em Integrações → Chaves de API, gere a chave do ambiente e cole em `ASAAS_API_KEY` no Render (serviço `sfl-api`). Não coloque a chave no Git.
3. Gere um token próprio, com 32 a 255 caracteres, sem espaço e diferente da chave da API. Esse valor é o `ASAAS_WEBHOOK_TOKEN`.
4. No Asaas, crie um webhook apontando para `https://<url-da-api>/api/webhooks/asaas`, com o mesmo token (header `asaas-access-token`) e os eventos `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_DELETED`, `SUBSCRIPTION_INACTIVATED` e `SUBSCRIPTION_DELETED`.
5. Defina `ASAAS_ENV=sandbox`. Faça redeploy. Confira a tela: o aviso de desativado some e aparece “sandbox”.
6. Crie a assinatura de 2 ou 3 jogadores, copie o link da fatura e pague com os dados de teste do Asaas. O status deve ir para “em dia” sem atualizar a página na mão (o webhook faz isso).
7. Quando for valer de verdade, gere a chave de produção, troque `ASAAS_ENV` para `production`, atualize o webhook para a URL de produção e rode de novo com um jogador antes de abrir para o grupo.

A compra da suspensão (padrão R$ 15, no lugar dos 3 amarelos) só libera o jogador se a opção estiver marcada em Regras da mensalidade. Ela nasce desligada.
