# Tarefas assíncronas

## Arquitetura

- A API valida a solicitação, cria `TarefaAssincrona` no MySQL e publica um job BullMQ.
- A resposta de criação é `202 Accepted` com o UUID da tarefa.
- O processo `worker` é independente da API; nunca é iniciado dentro de uma requisição.
- O MySQL é a fonte de verdade para status, tentativas e resultado. Redis/BullMQ coordena entrega, concorrência, retries e backoff.
- O `jobId` é o UUID da tarefa. `Idempotency-Key` opcional é armazenada como hash e escopada ao usuário autenticado.
- Tentativas padrão: 3; backoff exponencial iniciado por `TASK_BACKOFF_MS`.
- Resultados são JSON no MySQL, com expiração padrão de 168 horas. Não são gravados em diretório público.

## Endpoints e CRUD

Todos os endpoints abaixo exigem JWT de `ADMINISTRADOR` ou `AUDITOR`.

| Método | Endpoint | Operação |
|---|---|---|
| POST | `/api/v1/tarefas` | Cria/enfileira tarefa e responde 202 |
| GET | `/api/v1/tarefas` | Lista com filtros `status`, `tipo`, `pagina` e `limite` |
| GET | `/api/v1/tarefas/:id` | Consulta status, tentativas e resultado |
| PATCH | `/api/v1/tarefas/:id` | Atualização controlada: `{ "acao": "CANCELAR" }` |
| DELETE | `/api/v1/tarefas/:id` | Remove tarefa somente se `CONCLUIDA`, `FALHOU` ou `CANCELADA` |
| GET | `/api/v1/tarefas/:id/download` | Baixa resultado JSON privado após conclusão |

O tipo da tarefa é imutável. Os parâmetros podem ser alterados por `PATCH` somente enquanto a tarefa estiver `PENDENTE`; a atualização é condicional no banco e perde a corrida se o worker já tiver reivindicado a tarefa. A mesma rota aceita `{ "acao": "CANCELAR" }`, também somente enquanto `PENDENTE`. Tarefas `PROCESSANDO` e estados terminais não podem ser cancelados nem editados. A exclusão física só é permitida em estados terminais. Se uma tarefa com `Idempotency-Key` for editada, uma repetição da solicitação original com payload antigo será rejeitada com `409`, pois o conteúdo já não corresponde ao registro.

### Exemplo de criação

```http
POST /api/v1/tarefas
Authorization: Bearer <access-token>
Idempotency-Key: relatorio-status-2026-001
Content-Type: application/json
```

```json
{
  "tipo": "GERACAO_RELATORIO",
  "parametros": {
    "relatorio": "STATUS",
    "status": "AGUARDANDO_TRIAGEM"
  }
}
```

Resposta `202`:

```json
{
  "id": "uuid-da-tarefa",
  "status": "PENDENTE",
  "statusUrl": "/api/v1/tarefas/uuid-da-tarefa"
}
```

### Tipos aceitos

- `GERACAO_RELATORIO`: `parametros.relatorio` deve ser `FINANCEIRO`, `ORGANIZACAO` ou `STATUS`. Relatórios financeiros e organizacionais exigem `inicio` e `fim`; o organizacional também exige `organizacaoId`; status exige `status`.
- `ANALISE_EFICIENCIA`
- `ANALISE_RENTABILIDADE`
- `ANALISE_VIDA_UTIL`
- `ANALISE_COMPLETA`

As rotas de análise (`POST /api/v1/analises/eficiencia`, `/rentabilidade` e `/vida-util`) também enfileiram tarefas e respondem `202`.

## Swagger / OpenAPI

- Interface: `/docs`
- Documento OpenAPI JSON: `/openapi.json`
- A especificação usa OpenAPI `3.0.3`.
- O Swagger UI aponta explicitamente para `/openapi.json`, evitando depender de URL implícita de documento.

## Configuração local

No Windows, Redis pode ser executado pelo Memurai ou pelo Redis dentro do WSL2. Configure `REDIS_URL` para o endereço acessível pelo processo Node.js, normalmente `redis://127.0.0.1:6379/0`.

Variáveis relevantes:

- `REDIS_URL`: conexão Redis da aplicação.
- `REDIS_PREFIX`: prefixo da fila; letras, números, hífen e underscore, sem `:`.
- `WORKER_CONCURRENCY`: concorrência do worker.
- `TASK_MAX_ATTEMPTS`: número máximo de tentativas.
- `TASK_BACKOFF_MS`: atraso inicial do backoff exponencial.
- `TASK_STALE_MS`: tempo sem heartbeat para considerar uma tarefa PROCESSANDO abandonada.
- `TASK_RESULT_TTL_HOURS`: expiração do resultado persistido.
- `TEST_REDIS_URL`: banco lógico Redis separado para integração; não use `/0`.

## Inicialização

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Em outro terminal:

```bash
npm run worker
```

Em produção, execute `npm start` e `npm run start:worker` como processos separados. Ambos usam o mesmo `DATABASE_URL` e `REDIS_URL`.

## Falhas, retries e reconciliação

- A tarefa é persistida no MySQL antes da publicação no Redis. Se Redis estiver indisponível, fica `PENDENTE` e a reconciliação do worker tentará publicá-la novamente.
- O worker atualiza `atualizadoEm` periodicamente enquanto processa.
- A cada 30 segundos, a reconciliação procura tarefas `PENDENTE` e tarefas `PROCESSANDO` sem heartbeat por mais que `TASK_STALE_MS`, compara com o estado BullMQ e recupera jobs ausentes/abandonados.
- O worker reivindica a tarefa com atualização condicional no banco, impedindo que um job atrasado execute após cancelamento.
- Após esgotar as tentativas, a tarefa fica `FALHOU` e guarda a mensagem de erro.
- Se o worker estiver parado, a reconciliação é executada quando ele voltar. Mantenha o processo supervisionado e pelo menos uma instância ativa.

## Testes

Testes unitários usam mocks e não exigem Redis. Testes de integração exigem:
- `TEST_DATABASE_URL` apontando para banco MySQL exclusivo com nome terminado em `_test`;
- `TEST_REDIS_URL` apontando para Redis de teste (DB lógico diferente de `/0`).

Nunca aponte as variáveis de teste para infraestrutura de produção ou para o banco de desenvolvimento.
