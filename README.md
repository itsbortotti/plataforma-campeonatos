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
4. O blueprint deixa `SEED_ADMIN=false`. Para criar o Master a primeira vez, siga a seção abaixo. Não versione a senha.
5. Domínio próprio: no serviço `sfl-web` → Custom Domain → na Hostinger, CNAME para o host do Render.

Fotos de jogador ficam em `UPLOAD_DIR` (`/var/data/uploads` no blueprint). O disco `sfl-uploads` já está montado em `/var/data`. No start, o entrypoint e a API criam `player-photos` e `system` dentro dessa pasta.

## Senha do Master (`SEED_ADMIN_PASSWORD`)

A senha do usuário Master já apareceu no histórico público do Git. O histórico **não** foi reescrito. O valor atual precisa ser trocado no Render pelo dono da conta.

`render.yaml` declara `SEED_ADMIN=false` e `SEED_ADMIN_RESET_PASSWORD=false`. Um sync do blueprint não volta a ligar o seed em todo start. Com `SEED_ADMIN=true`, o `entrypoint.sh` roda `prisma/seed-admin.ts` e:

- cria o usuário Master só se ainda não existir (e-mail canônico ou legado, por exemplo `master@sfl.local` ou `admin@sfl.local`);
- não regrava `passwordHash`, e-mail nem papel de um admin que já existe;
- regrava só o hash se `SEED_ADMIN_RESET_PASSWORD=true` no mesmo start;
- se a senha estiver vazia ou fraca, registra o erro e segue. Essa validação não encerra o container: o servidor sobe mesmo assim.

Para criar o admin, ou para trocar a senha de quem já existe:

1. No serviço `sfl-api`, abra **Environment**. A senha fica só em `SEED_ADMIN_PASSWORD`. Não cole o valor no repositório, no README, em issue ou em commit.
2. Use no mínimo 12 caracteres, com letras e números.
3. Para criar: `SEED_ADMIN=true`. Para trocar a senha de um admin que já existe: também `SEED_ADMIN_RESET_PASSWORD=true`.
4. Salve e faça redeploy do `sfl-api`. Confira o login em `/master/login`.
5. Volte `SEED_ADMIN` e `SEED_ADMIN_RESET_PASSWORD` para `false`. O próximo sync do blueprint também deixa as duas assim.

Não há valor de exemplo utilizável neste repositório. No ambiente local, exporte a variável no `backend/.env` (arquivo gitignored) antes de `npm run seed:admin`. O comando local segue a mesma regra: cria se faltar e só troca a senha com `SEED_ADMIN_RESET_PASSWORD=true`.

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
