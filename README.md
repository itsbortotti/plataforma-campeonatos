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
| Login Master | http://127.0.0.1:3000/master/login — `admin@sfl.local` / `admin123` |
| Login Time | http://127.0.0.1:3000/time/login |
| Painel Master | http://127.0.0.1:3000/admin |
| Painel do time | http://127.0.0.1:3000/capitao |

ACL: Master = `owner` / `league_admin` (e bootstrap `admin`). Time = `team_staff` / `captain` no time concedido.

O Next reescreve `/api/*` para a API (`NEXT_PUBLIC_API_URL`, padrão `http://127.0.0.1:4006`).

## Importação de produção

Copie `.env.import.example` → `backend/.env.import` e rode `npm run import:prod` na pasta `backend/`.
