# Documento técnico 

> Documento derivado do código, schema Prisma, migrations e testes presentes neste repositório. Uma funcionalidade só é descrita como validada quando há evidência de teste/execução registrada. Consulte também `docs/Regras_de_Negocio.md` para critérios funcionais.

## 1. Visão arquitetural

A aplicação permanece um monólito modular: Node.js 22.12+, TypeScript, Fastify 5, Prisma 7.10.1 e MySQL. A API HTTP e o worker são processos separados, mas compartilham módulos de domínio, banco e Redis.

- API: `src/server.ts` → `buildApp()` → plugins e rotas.
- Worker: `src/worker.ts` → reconciliação, scheduler e `Worker` BullMQ.
- Persistência: Prisma Client com adapter MariaDB e MySQL.
- Filas: BullMQ sobre Redis.
- Documentação HTTP: Swagger UI em `/docs` e documento OpenAPI em `/openapi.json`.

Fluxo de camadas: rotas/controller → services → repositories → Prisma. Regras de domínio ficam em `src/dominio/`. A separação é modular, não uma arquitetura de microserviços.

## 2. Camada analítica

Os serviços analíticos estão em `src/modules/analises/analises.service.ts`; o repositório consulta dados operacionais e o mapper normaliza a resposta persistida. Cada execução gera um registro em `ResultadoAnalitico` com tipo, título, descrição, JSON de dados, parâmetros, período, versão de modelo e timestamp.

### 2.1 Biblioteca e método estatístico

A implementação atual **não importa `simple-statistics` nem `mathjs`**. Os cálculos são feitos com TypeScript/JavaScript nativo, em funções explícitas. Essa decisão evita dependência adicional para operações simples e torna as fórmulas auditáveis no próprio código. `node-cron` também não é utilizado: o agendamento é feito pelo scheduler nativo do BullMQ.

### 2.2 Eficiência operacional

- Fonte: lotes com data de entrada e data de conclusão da triagem.
- Observação: uma duração por lote válido.
- Fórmula: `duracaoHoras = (triagemConcluidaEm - dataEntrada) / 3.600.000`.
- Saídas: amostra, registros ignorados, média, mínimo, máximo e status de suficiência (três observações).
- Limitação: não há atribuição confiável a operador individual.

### 2.3 Rentabilidade

- Fonte: avaliações de recuperação.
- Agrupamento: tipo de equipamento, snapshot do estado físico, marca e modelo.
- Saídas: média estimada e média realizada, com contagens separadas.
- `valorEstimado` e `valorRealizado` são séries independentes. Estimativa não é receita. A implementação não calcula lucro líquido, ROI ou margem porque não agrega custos totais/despesas.

### 2.4 Vida útil remanescente

A implementação chama o método `REGRESSAO_LINEAR_SIMPLES`. Para cada equipamento, `x` é o número de dias desde a primeira observação e `y` é `valorAtual`.

`b = Σ((xᵢ - x̄)(yᵢ - ȳ)) / Σ((xᵢ - x̄)²)`

`a = ȳ - b x̄`

`R² = 1 - SSE/SST`

Com inclinação negativa e último valor atual positivo:

`diasEstimados = valorAtualMaisRecente / (-b)`

São exigidas pelo menos três observações e datas com variação. Inclinação não negativa, valor atual não positivo ou amostra insuficiente impedem a previsão. Falhas e custos são contexto descritivo, não preditores.

**Limitações:** extrapolação linear exploratória até valor depreciado zero; não é vida física garantida. Não incorpora intensidade de uso, obsolescência, ambiente, fabricante ou variáveis de reparo. R² não estabelece causalidade. Resultados dependem da janela e são sensíveis a outliers.

### 2.5 Parâmetros, histórico e limites

- Período máximo quando início e fim são informados: 366 dias.
- `limiteAmostra`: 3 a 10.000; padrão 10.000.
- Versão atual do modelo: `1.0.0`.
- Cada execução cria um novo `ResultadoAnalitico`; resultados antigos são consultados sem recalcular.
- Edição do registro altera título/descrição, não os dados calculados. Exclusão remove o registro.
- Não há geração de histórico retroativo artificial; a análise depende dos registros efetivamente existentes.

## 3. API interna e API pública

### 3.1 API interna

A API interna usa JWT e papéis. As rotas de análise e tarefas assíncronas exigem `ADMINISTRADOR` ou `AUDITOR`. Endpoints de análise (`POST /api/v1/analises/eficiencia`, `/rentabilidade`, `/vida-util`) enfileiram uma tarefa e retornam HTTP 202. O histórico de resultados é consultado por `GET /api/v1/analises` e `GET /api/v1/analises/:id`.

Tarefas: `POST/GET /api/v1/tarefas`, `GET /:id`, `PATCH /:id`, `DELETE /:id` e `GET /:id/download`, sob autenticação JWT e papéis `ADMINISTRADOR` ou `AUDITOR`.

### 3.2 API pública

Prefixo: `/api/v1/public`. Autenticação pelo cabeçalho `x-api-key`. A chave está vinculada a uma organização, e a consulta/alteração de dados usa o `organizacaoId` da chave, não um ID fornecido pelo parceiro.

Rotas existentes nesta versão:
- `POST /lotes` — exige `LOTES_ESCRITA`; a organização é inferida da chave.
- `GET /lotes` e `GET /lotes/:id` — exige `LOTES_LEITURA`.
- `GET /equipamentos/:id/rastreabilidade` — exige `RASTREABILIDADE_LEITURA`.
- `GET /analises` — exige `ANALISES_LEITURA`.

O enum contém escopos adicionais, mas isso não significa que existam endpoints públicos de tarefas, relatórios ou equipamentos genéricos. A API pública não cria tarefas analíticas nesta versão.

### 3.3 Gerenciamento de chaves

`/api/v1/chaves-api` é administrativo, exige JWT e papel `ADMINISTRADOR`. Segredo aleatório `gcp_live_...`; banco guarda hash SHA-256 e prefixo, e o segredo completo aparece somente na criação. Há operações administrativas de listagem, consulta, revogação e rotação implementadas no módulo.

### 3.4 Rate limit e segurança

O plugin público configura 120 requisições por minuto. A chave do limitador é o hash SHA-256 da chave apresentada; sem `x-api-key`, usa o IP. O rate limit é fixo no código, global ao escopo público, não um limite configurável individual por parceiro.

O logger Fastify mascara o cabeçalho `x-api-key`. Não registrar segredos, JWTs ou hashes em logs. Usar TLS em implantação externa, guardar `.env` fora do controle de versão, gerar `JWT_SECRET` forte e rotacionar chaves expostas. O rate limit em memória/instância não deve ser tratado como quota global distribuída entre múltiplas instâncias sem confirmar o armazenamento compartilhado do plugin.

### 3.5 CORS para clientes web

CORS é habilitado somente quando `CORS_ORIGINS` contém uma lista de origens exatas. O preflight permite `Authorization`, `Content-Type`, `Idempotency-Key` e `x-api-key`; este último é necessário para parceiros que consumam a API pública diretamente de navegadores. `Content-Disposition` é exposto para que o frontend possa ler o nome do arquivo em respostas de download. Em produção, configure somente as origens confiáveis do painel e dos clientes web autorizados; não habilite origem curinga.

## 4. BullMQ, Redis e worker

### 4.1 Responsabilidades

- MySQL (`TarefaAssincrona`) é o registro durável e fonte de verdade do estado.
- Redis/BullMQ coordenam a entrega, espera, execução e retry dos jobs.
- Producer cria a tarefa no MySQL antes de publicar no Redis.
- Worker processa análises ou relatórios e grava resultado JSON no MySQL.
- API responde 202 sem manter a conexão HTTP aberta durante o cálculo.

### 4.2 Estados

`PENDENTE` → `PROCESSANDO` → `CONCLUIDA` ou `FALHOU`; `PENDENTE` pode ir a `CANCELADA`. Em retry, o worker devolve o registro a `PENDENTE`. Somente tarefas pendentes aceitam edição de parâmetros/cancelamento; somente estados terminais podem ser excluídos.

### 4.3 Retry e idempotência

- Máximo de tentativas configurado por `TASK_MAX_ATTEMPTS` (padrão 3).
- Backoff exponencial iniciado em `TASK_BACKOFF_MS` (padrão 5.000 ms).
- Idempotência opcional por `Idempotency-Key`, com hash SHA-256 e escopo por usuário/agenda.
- Mesmo identificador e mesmo payload retornam a tarefa existente; payload diferente resulta em HTTP 409.
- O worker usa reivindicação condicional no MySQL, heartbeat e reconciliação periódica. A reconciliação procura tarefas pendentes e `PROCESSANDO` obsoletas, verifica o estado no Redis e re-enfileira quando necessário.
- Se Redis falhar no publish inicial, a tarefa continua persistida como pendente e pode ser recuperada pela reconciliação.
- Resultado JSON expira após `TASK_RESULT_TTL_HOURS` (padrão 168 horas); a reconciliação limpa o payload expirado.

### 4.4 Agendamento recorrente

O worker registra `upsertJobScheduler` com ID estável `greencode-analises-completas-diarias`, expressão cron e timezone configuráveis. Cada ocorrência despacha uma tarefa `ANALISE_COMPLETA` usando o ID do job como chave idempotente. O scheduler não é iniciado no processo HTTP. A habilitação é opt-in (`ANALYTICS_SCHEDULE_ENABLED=false` por padrão).

Os logs de scheduler registram início/fim/falha do despacho; `duracaoMs` do log mede o despacho, não a duração completa das análises. A duração real da tarefa é persistida em `TarefaAssincrona.duracaoMs`.

## 5. Escalabilidade, observabilidade e operação

### 5.1 Escalabilidade

É possível executar mais de um processo worker contra o mesmo Redis/MySQL, ajustando `WORKER_CONCURRENCY`. BullMQ distribui jobs entre workers; a persistência e idempotência no MySQL reduzem duplicidade lógica. A capacidade real depende de CPU, memória, consultas e limites do banco. Não há benchmark de throughput ou dimensionamento validado neste repositório.

Para escalar horizontalmente, usar Redis persistente e monitorado, MySQL com backups, limites de conexão adequados e processo de deploy que aplique migrations antes de iniciar versões novas. O rate limit público atual não deve ser presumido como quota distribuída entre instâncias.

### 5.2 Observabilidade

- API: logs estruturados do Fastify; cabeçalho de chave pública mascarado.
- Worker: logs de erro, eventos de falha BullMQ, logs estruturados do scheduler.
- Persistência: status, tentativas, datas de início/conclusão, erro e `duracaoMs` em `TarefaAssincrona`.
- Saúde: `GET /api/v1/saude` verifica consulta ao MySQL.
- Não há stack de métricas Prometheus/Grafana, tracing distribuído ou painel operacional implementado. Monitoramento externo e alertas são decisões futuras.

### 5.3 Windows

- MySQL 8 e Redis compatível em execução local.
- Redis pode ser fornecido por Memurai; confirmar serviço ativo e `redis-cli ping` (ou ferramenta equivalente) antes de iniciar worker.
- Abrir dois terminais na pasta do projeto: `npm run dev` para API e `npm run worker` para worker.
- Configurar `REDIS_URL=redis://127.0.0.1:6379/0`; para integração, `TEST_REDIS_URL` deve apontar para DB lógico separado, por exemplo `/1`.
- O projeto não depende de Docker para Windows quando MySQL e Memurai estão instalados localmente.

### 5.4 Ubuntu/Linux

- Instalar Node.js 22.12+, MySQL 8 e Redis 7 compatível; alternativamente, o `docker-compose.yml` fornece serviços Redis e MySQL para desenvolvimento.
- Iniciar serviços com systemd ou `docker compose up -d`; aguardar health checks.
- Executar API e worker como processos separados, preferencialmente serviços supervisionados (systemd/process manager). Configurar firewall, TLS/reverse proxy e segredos externos.
- `docker-compose.yml` é configuração de desenvolvimento; credenciais ilustrativas nele não devem ser reutilizadas em produção.

## 6. Configuração e comandos

Veja o README para configuração detalhada, migrations, seed, comandos de execução/testes e exemplos curl.

## 7. Limitações e decisões futuras

- Nenhuma biblioteca estatística externa foi adotada até esta versão; `simple-statistics`/`mathjs` podem ser avaliadas se novos métodos justificarem dependências.
- A API pública não oferece submissão de tarefas/relatórios nesta versão.
- Resultados são JSON no MySQL; armazenamento externo de arquivos não está implementado.
- Webhooks, quotas por parceiro, rate limit distribuído, métricas centralizadas, tracing, exportação CSV/PDF, modelos multivariados e benchmark de carga permanecem decisões futuras.
- A política de retenção elimina o payload após expiração, mas o registro da tarefa permanece até exclusão explícita.
- A agenda padrão é diária às 02:00 no fuso configurado, porém permanece desabilitada até habilitação explícita.
