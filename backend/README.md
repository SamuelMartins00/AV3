# GreenCode — Backend

API REST de logística reversa de equipamentos eletrônicos. A AV3 amplia a base AV2 com análises, integração pública por chave de API e processamento assíncrono por BullMQ/Redis.

Documentação funcional: [`docs/Regras_de_Negocio.md`](../docs/Regras_de_Negocio.md).  
Arquitetura, fórmulas, segurança, fila e limitações: [`docs/Documento_Tecnico.md`](../docs/Documento_Tecnico.md). 
Decisões arquiteturais anteriores: [`docs/DECISOES.md`](../docs/DECISOES.md).

## 1. Pré-requisitos

- Node.js 22.12 ou superior e npm.
- MySQL 8.0.16 ou superior.
- Redis 7 compatível com BullMQ. No Windows, Memurai pode ser utilizado como serviço Redis compatível.
- Git.

Docker Compose é opcional. O projeto pode ser executado no Windows nativo com MySQL e Memurai instalados.

## 2. Instalação e configuração

Todos os comandos deste documento são executados dentro de `backend/`:

```bash
cd backend
npm ci
```

Copie `.env.example` para `.env` e ajuste as credenciais locais. Não versione `.env` nem compartilhe senhas, JWT secrets ou chaves de API.

```powershell
# PowerShell
Copy-Item .env.example .env
```

```bash
# Linux
cp .env.example .env
```

### Variáveis

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | MySQL principal usado pela aplicação e Prisma |
| `TEST_DATABASE_URL` | Banco exclusivo de integração; nome deve terminar em `_test` |
| `REDIS_URL` | Redis da aplicação, DB lógico `/0` por padrão |
| `TEST_REDIS_URL` | Redis isolado para integração, DB lógico `/1` por padrão |
| `REDIS_PREFIX` | Prefixo simples para nomes das filas |
| `WORKER_CONCURRENCY` | Jobs concorrentes por worker |
| `TASK_MAX_ATTEMPTS` | Tentativas máximas de tarefa |
| `TASK_BACKOFF_MS` | Atraso inicial do backoff exponencial |
| `TASK_STALE_MS` | Idade a partir da qual tarefa PROCESSANDO é considerada obsoleta |
| `TASK_RESULT_TTL_HOURS` | Retenção do payload JSON do resultado |
| `ANALYTICS_SCHEDULE_ENABLED` | Habilita agenda recorrente; falso por padrão |
| `ANALYTICS_SCHEDULE_CRON` | Expressão cron da agenda |
| `ANALYTICS_SCHEDULE_TIMEZONE` | Fuso IANA, por exemplo `America/Sao_Paulo` |
| `PORT`, `HOST` | Endereço de escuta da API |
| `JWT_SECRET` | Segredo forte para JWT |
| `JWT_ACCESS_EXPIRES` | Expiração do access token |
| `REFRESH_TTL_MINUTES` | Validade do refresh token |
| `BCRYPT_COST` | Custo do bcrypt |
| `LOGIN_RATE_LIMIT_MAX` | Tentativas por minuto no login (por IP + usuário); o refresh aceita 6x esse valor (mínimo 60) por IP. Padrão 10 |
| `DB_ALLOW_PUBLIC_KEY_RETRIEVAL` | Opcional. Permite ao driver buscar a chave RSA do MySQL 8 (`caching_sha2_password`). Automático em `localhost`; em host remoto sem TLS defina `true` (menos seguro) |
| `CORS_ORIGINS` | Origens permitidas para CORS, separadas por vírgula. Vazio = CORS desabilitado (padrão) |

`TEST_DATABASE_URL` e `TEST_REDIS_URL` são usados pela configuração da suíte de integração; não substitua os bancos de desenvolvimento por bancos de teste.

Para desenvolvimento do frontend em outra origem (por exemplo, Vite em `http://localhost:5173`), configure `CORS_ORIGINS` com a origem exata do frontend. A API aceita `Authorization`, `Content-Type`, `Idempotency-Key` e `x-api-key` no preflight CORS. O cabeçalho `x-api-key` é necessário para chamadas da API pública feitas diretamente pelo navegador. Não use curingas em produção; liste apenas origens confiáveis.

## 3. MySQL e Redis

Crie os bancos `logistica_db` e `logistica_db_test` com o usuário MySQL local configurado nas URLs. O usuário pode ser `root` no ambiente local se essa for a política do ambiente; use credenciais próprias e privilégio mínimo em ambientes compartilhados/produção.

Com Docker Compose (opcional):

```bash
docker compose up -d
```

O compose inicia MySQL e Redis e executa `docker/init.sql` para preparar o banco de testes. Em Windows nativo, inicie o serviço MySQL e Memurai manualmente e confirme a disponibilidade do Redis antes do worker.

## 4. Prisma e banco

Gerar o cliente:

```bash
npm run db:generate
```

Aplicar migrations já versionadas:

```bash
npx prisma migrate deploy
```

Em desenvolvimento, para criar uma nova migration após alterar o schema:

```bash
npm run db:migrate
```

Executar seed demonstrativo:

```bash
npm run db:seed
```

**Atenção:** o seed cria dados fictícios para demonstração e imprime credenciais de desenvolvimento no terminal. Não execute em produção nem em banco com dados que devam ser preservados. Migrations são incrementais; não use `prisma migrate reset` em bancos com dados importantes.

Para aplicar as migrations ao banco de integração (`TEST_DATABASE_URL`), use o script que valida o nome terminado em `_test` antes de migrar:

```bash
npm run db:test:prepare
```

## 5. Execução

API em modo desenvolvimento:

```bash
npm run dev
```

Worker assíncrono em outro terminal:

```bash
npm run worker
```

Build e execução compilada:

```bash
npm run build
npm start
```

Worker compilado:

```bash
npm run start:worker
```

A API e o worker são processos independentes. Iniciar apenas a API não processa tarefas. O Redis precisa estar disponível para o worker.

## 6. Testes

Testes unitários:

```bash
npm test
```

Verificação TypeScript:

```bash
npx tsc --noEmit
```

Testes de integração:

```bash
npm run test:integracao
```

Antes da integração, configure `TEST_DATABASE_URL` para um banco dedicado terminado em `_test`, aplique as migrations nele (`npm run db:test:prepare`) e configure `TEST_REDIS_URL` para uma base Redis isolada. A suíte pode limpar dados do banco de teste. Nunca aponte essas variáveis para o banco de desenvolvimento ou produção.

## 7. Swagger / OpenAPI

Com a API iniciada:

- Swagger UI: `http://127.0.0.1:3000/docs`
- Documento OpenAPI: `http://127.0.0.1:3000/openapi.json`
- Health check: `http://127.0.0.1:3000/api/v1/saude`

A URL muda conforme `HOST` e `PORT`.

## 8. Exemplos curl

Os exemplos usam variáveis de shell para evitar repetir tokens e segredos. Primeiro autentique um usuário interno pelo endpoint de login existente e preencha `JWT` com o access token retornado. A criação de chave de API é administrativa.

### 8.1 Login interno

```bash
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"SEU_USUARIO","senha":"SUA_SENHA"}'
```

Defina `JWT` com o access token da resposta:

```bash
# Linux/macOS
export JWT="ACCESS_TOKEN"
```

```powershell
# PowerShell
$JWT = "ACCESS_TOKEN"
```

### 8.2 Executar análise interna (assíncrona)

```bash
curl -X POST http://127.0.0.1:3000/api/v1/analises/eficiencia \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: analise-eficiencia-001" \
  -d '{"organizacaoId":1,"inicio":"2026-01-01T00:00:00.000Z","fim":"2026-06-30T23:59:59.999Z","limiteAmostra":10000}'
```

Resposta esperada: HTTP 202 com `id`, `status` e `statusUrl`. O worker precisa estar ativo.

### 8.3 Criar tarefa interna

Exemplo de relatório financeiro:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/tarefas \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: relatorio-financeiro-001" \
  -d '{"tipo":"GERACAO_RELATORIO","parametros":{"relatorio":"FINANCEIRO","inicio":"2026-01-01T00:00:00.000Z","fim":"2026-06-30T23:59:59.999Z"}}'
```

Tipos aceitos: `GERACAO_RELATORIO`, `ANALISE_EFICIENCIA`, `ANALISE_RENTABILIDADE`, `ANALISE_VIDA_UTIL` e `ANALISE_COMPLETA`. Para relatório `ORGANIZACAO`, informe também `organizacaoId`; para `STATUS`, informe `parametros.status`.

### 8.4 Polling (consultar status)

Substitua `ID_DA_TAREFA` pelo UUID retornado:

```bash
curl http://127.0.0.1:3000/api/v1/tarefas/ID_DA_TAREFA \
  -H "Authorization: Bearer $JWT"
```

Estados: `PENDENTE`, `PROCESSANDO`, `CONCLUIDA`, `FALHOU`, `CANCELADA`. Quando concluída e dentro da retenção, a resposta inclui `resultado` e `downloadUrl`.

### 8.5 Obter resultado

Consulta direta:

```bash
curl http://127.0.0.1:3000/api/v1/tarefas/ID_DA_TAREFA \
  -H "Authorization: Bearer $JWT"
```

Ou endpoint de download JSON:

```bash
curl http://127.0.0.1:3000/api/v1/tarefas/ID_DA_TAREFA/download \
  -H "Authorization: Bearer $JWT"
```

O resultado expira após `TASK_RESULT_TTL_HOURS` horas (padrão 168); o endpoint de download é privado e exige JWT.

### 8.6 Criar chave de API para parceiro

Somente administrador autenticado:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/chaves-api \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"organizacaoId":1,"nome":"Integracao Parceiro","permissoes":["LOTES_LEITURA","RASTREABILIDADE_LEITURA","ANALISES_LEITURA"]}'
```

Guarde o campo `segredo` da resposta imediatamente: ele é exibido uma única vez. O banco armazena somente o hash.

### 8.7 API pública — listar lotes

```bash
curl http://127.0.0.1:3000/api/v1/public/lotes \
  -H "x-api-key: gcp_live_SEU_SEGREDO"
```

### 8.8 API pública — consultar rastreabilidade

```bash
curl http://127.0.0.1:3000/api/v1/public/equipamentos/123/rastreabilidade \
  -H "x-api-key: gcp_live_SEU_SEGREDO"
```

### 8.9 API pública — criar lote

A organização é inferida da chave; não envie `organizacaoId` no corpo.

```bash
curl -X POST http://127.0.0.1:3000/api/v1/public/lotes \
  -H "x-api-key: gcp_live_SEU_SEGREDO" \
  -H "Content-Type: application/json" \
  -d '{"dataEntrada":"2026-11-10T10:00:00.000Z","notaFiscal":"NF-DEMO-001","transportadora":"Transportadora Exemplo","observacoes":"Lote de integração"}'
```

## 9. Operação e limitações conhecidas

- No Windows, Memurai pode fornecer Redis local. Inicie API e worker em terminais separados.
- No Ubuntu, use Redis/MySQL instalados ou Docker Compose para desenvolvimento; em produção, prefira serviços supervisionados, TLS, backups e segredos externos.
- O agendamento analítico é desabilitado por padrão. Para habilitar no worker, defina `ANALYTICS_SCHEDULE_ENABLED=true`, revise cron e timezone.
- Parceiros também podem solicitar análises assíncronas por `POST /api/v1/public/analises` e consultar/baixar em `/tarefas/:id` e `/tarefas/:id/download`, sempre com `x-api-key` e isolamento por organização/chave. O endpoint público usa o escopo `ANALISES_LEITURA`.
- O rate limit público é fixo em 120 requisições/minuto por chave ou IP. Quotas individuais e rate limit distribuído são futuras melhorias.
- Resultados são armazenados como JSON no MySQL; armazenamento de arquivos externo, webhooks, métricas Prometheus/Grafana e tracing distribuído não estão implementados.
- A regressão de vida útil é exploratória e não equivale a previsão técnica garantida.


### 8.10 API pública — solicitar relatório analítico assíncrono

```bash
curl -X POST http://127.0.0.1:3000/api/v1/public/analises \
  -H "x-api-key: gcp_live_SEU_SEGREDO" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: relatorio-parceiro-2026-01" \
  -d '{"tipo":"ANALISE_COMPLETA","inicio":"2026-01-01T00:00:00.000Z","fim":"2026-12-31T23:59:59.999Z"}'
```

O tipo pode ser omitido para gerar as três análises. A resposta HTTP 202 contém `id`, `statusUrl` e `downloadUrl`. Consulte `statusUrl` periodicamente até `CONCLUIDA` e então baixe o JSON em `downloadUrl`. A organização não deve ser enviada no corpo: ela é derivada da API key.
