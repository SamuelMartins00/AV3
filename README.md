# GreenCode — AV3

Logística reversa de equipamentos eletrônicos: API REST (Fastify + Prisma + MySQL + BullMQ/Redis) e painel web (React + Vite).

```text
.
├── backend/             # API, worker, Prisma (schema, migrations, seed) e testes
├── frontend/            # Aplicação web React + Vite + TypeScript
├── docs/                # Regras de negócio, documento técnico e decisões
├── docker/              # init.sql (cria os bancos usados pelo docker-compose)
└── docker-compose.yml   # MySQL 8 e Redis para desenvolvimento
```

- Backend: [`backend/README.md`](backend/README.md) (variáveis, migrations, testes, exemplos de API)
- Frontend: [`frontend/README.md`](frontend/README.md)
- Documentação: [`docs/`](docs/)

## Início rápido

Pré-requisitos: Node.js 22.12+, MySQL 8 e Redis 7 (ou Docker).

```bash
# 1. MySQL + Redis (opcional, se não tiver instalados)
docker compose up -d

# 2. Backend (terminal 1)
cd backend
npm ci
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
npm run db:generate
npx prisma migrate deploy
npm run db:seed             # imprime os usuários de desenvolvimento
npm run dev                 # http://127.0.0.1:3000  (Swagger em /docs)

# 3. Frontend (terminal 2)
cd frontend
npm ci
npm run dev                 # http://127.0.0.1:5173
```

O Vite encaminha `/api` para `http://127.0.0.1:3000`; não é preciso configurar CORS em desenvolvimento. Para processar tarefas assíncronas, rode também `npm run worker` em `backend/`.

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| A API encerra ao iniciar com "Não foi possível conectar ao banco" | MySQL parado, `DATABASE_URL` incorreta ou migrations pendentes | Confira o serviço, as credenciais e rode `npx prisma migrate deploy` |
| Login funciona, mas telas ficam sem dados e a aba Rede mostra 404 | Prefixo `/api/v1` repetido nas chamadas do front | Os caminhos em `frontend/src/features/*/api.ts` devem ser relativos (`/lotes`, não `/api/v1/lotes`) |
| `Table '...' doesn't exist` ao migrar no Linux/Docker | MySQL diferencia maiúsculas de minúsculas nos nomes de tabela | Use nomes com a mesma caixa do `init` (ex.: `Lote`) em novas migrations |
| `ER_CANNOT_RETRIEVE_RSA_KEY` | MySQL 8 remoto com `caching_sha2_password` sem TLS | Use TLS ou defina `DB_ALLOW_PUBLIC_KEY_RETRIEVAL=true` no `.env` do backend |
