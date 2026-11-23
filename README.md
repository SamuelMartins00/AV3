# Atividade Avaliativa 03 - GreenCode 

Plataforma de logística reversa de equipamentos eletrônicos, composta por uma API REST, um painel web e serviços de processamento assíncrono. O sistema reúne gestão operacional, rastreabilidade, auditoria, análises de dados e integração com parceiros por meio de uma API pública.

---

## Descrição do Sistema

O sistema é uma aplicação para apoiar o gerenciamento do fluxo de logística reversa de equipamentos eletrônicos. A solução permite administrar organizações e contratos, registrar lotes recebidos, cadastrar e acompanhar equipamentos, realizar triagens e movimentações e consultar informações operacionais.

Na AV3, a aplicação foi ampliada com três capacidades principais:

- **Camada analítica:** geração de análises de eficiência operacional, rentabilidade de equipamentos e previsão exploratória de vida útil remanescente.
- **API pública para parceiros:** integração externa por chaves de API individuais, permissões específicas e limitação de requisições.
- **Processamento assíncrono:** execução de relatórios e análises em segundo plano por meio de filas BullMQ e Redis, com acompanhamento do estado das tarefas.

O projeto está dividido em backend e frontend. O backend utiliza arquitetura modular em camadas e disponibiliza documentação interativa por Swagger/OpenAPI. O frontend oferece uma interface web com navegação conforme os papéis de acesso e consome a API HTTP; não acessa o MySQL nem o Redis diretamente.

---

## Tecnologias Utilizadas

| **Camada** | **Tecnologia** |
|---|---|
| **Runtime** | Node.js 22.12 ou superior |
| **Linguagem do backend** | TypeScript |
| **API HTTP** | Fastify 5 |
| **ORM e cliente de banco** | Prisma 7 |
| **Banco de dados** | MySQL 8.0.16 ou superior |
| **Fila e processamento assíncrono** | BullMQ 5 e Redis 7 |
| **Frontend** | React 19, Vite 7 e TypeScript |
| **Roteamento** | React Router 7 |
| **Estado e cache de requisições** | TanStack React Query 5 |
| **Comunicação HTTP** | Axios |
| **Gráficos** | Recharts |
| **Estilização** | Tailwind CSS 4 |
| **Documentação da API** | Swagger / OpenAPI |
| **Autenticação** | JWT, refresh tokens rotativos e bcrypt |
| **Testes** | Vitest |
| **Containerização dos serviços** | Docker Engine e Docker Compose |

---

## Autenticação e Perfis de Acesso

A aplicação utiliza autenticação JWT e controle de acesso baseado em papéis. Os perfis existentes são:

- **ADMINISTRADOR** — acesso administrativo aos módulos e operações permitidos pelas políticas do sistema.
- **OPERADOR_CADASTRO** — operações de organizações e acesso ao próprio perfil.
- **GESTOR_ALMOXARIFADO** — operações relacionadas a lotes, equipamentos e ao próprio perfil.
- **AUDITOR** — acesso a equipamentos, relatórios, análises, tarefas, auditoria e ao próprio perfil.

O frontend filtra a navegação e protege as telas de acordo com o papel do usuário. Essa filtragem não substitui a autorização do backend: a API continua sendo a autoridade final e valida as permissões em cada endpoint.

A autenticação utiliza access tokens e refresh tokens rotativos. O backend também contempla troca obrigatória de senha quando essa condição é indicada no login.

---

## Funcionalidades Principais

- **Autenticação e sessões** — login, renovação rotativa de sessão, logout, consulta de perfil e alteração de senha.
- **Usuários** — cadastro, consulta, edição, redefinição de senha, desativação, reativação e exclusão conforme as permissões.
- **Organizações e contratos** — cadastro e manutenção de organizações, consulta de contratos, renovação automática, renovação manual e encerramento.
- **Lotes** — recebimento, consulta, filtros, inclusão de equipamentos e acompanhamento da triagem.
- **Equipamentos** — cadastro, ficha detalhada, triagem individual, movimentações, histórico, avaliação de recuperação e baixa definitiva.
- **Auditoria** — consulta do journal de operações, com filtros e visualização de informações de auditoria.
- **Configuração global** — consulta e atualização de parâmetros utilizados pelo sistema.
- **Relatórios** — relatórios por organização, status e informações financeiras.
- **Análise de eficiência operacional** — análise de tempos e indicadores relacionados ao processamento e à triagem dos lotes.
- **Análise de rentabilidade** — análise de valores estimados e realizados na recuperação de materiais e equipamentos.
- **Análise de vida útil remanescente** — estimativas exploratórias baseadas nos dados históricos disponíveis; os resultados devem ser interpretados considerando as limitações da amostra e do modelo.
- **Históricos analíticos** — persistência de resultados para consulta posterior.
- **API pública** — endpoints versionados para integração de parceiros, autenticados por chave de API.
- **Permissões de chaves de API** — controle de acesso por permissões, como leitura de rastreabilidade, leitura e escrita de lotes, leitura de equipamentos, relatórios, análises e tarefas.
- **Tarefas assíncronas** — criação, consulta, atualização permitida, cancelamento, repetição controlada e obtenção de resultados de tarefas.
- **Fila de processamento** — execução dos jobs por worker independente, com tentativas e backoff.
- **Dashboard por papel** — painéis com informações compatíveis com os módulos disponíveis para cada perfil.
- **Documentação interativa** — endpoints internos e públicos documentados no Swagger.

---

## Estrutura do Projeto

```text
AV3-main/
├── backend/
│   ├── prisma/
│   │   ├── migrations/              # Migrações versionadas do banco
│   │   ├── schema.prisma            # Modelo de dados
│   │   └── seed.ts                  # Dados demonstrativos
│   ├── scripts/
│   │   └── preparar-banco-teste.ts  # Preparação segura do banco de integração
│   ├── src/
│   │   ├── config/                  # Configurações e conexão com o banco
│   │   ├── dominio/                 # Regras e conceitos do domínio
│   │   ├── infra/                   # Integrações de infraestrutura, como Redis
│   │   ├── modules/
│   │   │   ├── analises/
│   │   │   ├── auditoria/
│   │   │   ├── auth/
│   │   │   ├── chaves-api/
│   │   │   ├── configuracao/
│   │   │   ├── equipamentos/
│   │   │   ├── lotes/
│   │   │   ├── organizacoes/
│   │   │   ├── publica/
│   │   │   ├── relatorios/
│   │   │   ├── tarefas/
│   │   │   └── usuarios/
│   │   ├── plugins/                 # Plugins Fastify
│   │   ├── app.ts
│   │   ├── server.ts               # Inicialização da API
│   │   └── worker.ts               # Inicialização do worker
│   ├── tests/                      # Testes unitários e de integração
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                    # Layout e providers
│   │   ├── components/             # Componentes compartilhados
│   │   ├── features/               # Funcionalidades organizadas por domínio
│   │   ├── hooks/                  # Hooks compartilhados
│   │   ├── lib/                    # Clientes HTTP e bibliotecas
│   │   ├── routes/                 # Definição das rotas
│   │   ├── styles/                 # Estilos globais
│   │   └── types/                  # Tipos compartilhados
│   ├── .env.example
│   └── package.json
├── docker/
│   └── init.sql                    # Criação do banco de testes
├── docs/
│   ├── DECISOES.md
│   ├── Documento_Tecnico.md
│   ├── ENTENDENDO_AV3.md
│   └── Regras_de_Negocio.md
└── docker-compose.yml              # MySQL e Redis
```

---

## Requisitos

- Node.js **22.12 ou superior** e npm.
- MySQL **8.0.16 ou superior**.
- Redis **7** compatível com BullMQ.
- Git para clonar o repositório.
- Docker Engine com Docker Compose, caso opte por executar MySQL e Redis em contêineres.

No Windows, o MySQL pode ser executado como serviço local e o Redis pode ser fornecido pelo Memurai. Docker Compose é uma alternativa para iniciar os dois serviços.

---

## Configuração Local — Windows (PowerShell)

Os comandos abaixo consideram a execução a partir da pasta raiz do repositório.

### 1. Obter o projeto

```powershell
git clone https://github.com/SamuelMartins00/AV3.git
cd AV3
```

Se o repositório já estiver clonado, apenas entre na pasta existente.

### 2. Iniciar MySQL e Redis

Com o Docker Desktop aberto:

```powershell
docker compose up -d
docker compose ps
```

O Compose inicia o MySQL e o Redis. O script `docker/init.sql` prepara também o banco reservado aos testes de integração na primeira inicialização do volume.

### 3. Configurar o backend

```powershell
cd backend
Copy-Item .env.example .env
```

Edite o arquivo `backend/.env` e configure as credenciais locais do MySQL, os endereços do Redis e um `JWT_SECRET` forte. Não compartilhe nem versione esse arquivo.

### 4. Instalar dependências e preparar o banco

```powershell
npm ci
npm run db:generate
npx prisma migrate deploy
```

Opcionalmente, para criar dados demonstrativos:

```powershell
npm run db:seed
```

**Atenção:** o seed cria dados fictícios e imprime credenciais de desenvolvimento no terminal. Não o execute em produção nem em um banco com dados que devam ser preservados.

### 5. Iniciar a API

Em um terminal, dentro de `backend/`:

```powershell
npm run dev
```

A API ficará disponível em `http://127.0.0.1:3000`. A documentação Swagger estará em `http://127.0.0.1:3000/docs`.

### 6. Iniciar o worker

Abra outro terminal e, novamente dentro de `backend/`, execute:

```powershell
npm run worker
```

A API e o worker são processos independentes. A API recebe as solicitações; o worker consome e processa as tarefas da fila. Para executar relatórios e análises assíncronas, mantenha o Redis e o worker ativos.

### 7. Configurar e iniciar o frontend

Abra um terceiro terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

O Vite ficará disponível, por padrão, em `http://localhost:5173`. Em desenvolvimento, o Vite encaminha as chamadas iniciadas em `/api` para a API local na porta `3000`.

---

## Configuração no Linux (Ubuntu)

### 1. Instalar pré-requisitos

Instale Node.js 22.12 ou superior, npm, Git e Docker Engine com o plugin Docker Compose, ou prepare MySQL 8 e Redis 7 como serviços locais.

### 2. Clonar o projeto e iniciar os serviços

```bash
git clone https://github.com/SamuelMartins00/AV3.git
cd AV3
docker compose up -d
docker compose ps
```

### 3. Configurar e iniciar o backend

```bash
cd backend
cp .env.example .env
nano .env
npm ci
npm run db:generate
npx prisma migrate deploy
```

Depois de conferir o banco configurado, os dados demonstrativos podem ser criados opcionalmente:

```bash
npm run db:seed
```

Inicie a API:

```bash
npm run dev
```

Em outro terminal, inicie o worker:

```bash
cd AV3/backend
npm run worker
```

### 4. Iniciar o frontend

Em outro terminal:

```bash
cd AV3/frontend
cp .env.example .env
npm ci
npm run dev
```

Para uma implantação acessível externamente, configure firewall, proxy reverso, TLS e gerenciamento seguro de segredos. Não exponha a porta `3306` do MySQL nem a porta `6379` do Redis à internet pública.

---

## Variáveis de Ambiente

### Backend

Crie `backend/.env` a partir de `backend/.env.example`.

| **Variável** | **Descrição** |
|---|---|
| `DATABASE_URL` | URL de conexão com o MySQL principal. |
| `TEST_DATABASE_URL` | URL do banco exclusivo para testes de integração; o nome deve terminar em `_test`. |
| `REDIS_URL` | URL do Redis utilizado pela aplicação e pela fila. |
| `TEST_REDIS_URL` | URL do Redis isolado para testes de integração. |
| `REDIS_PREFIX` | Prefixo utilizado nos nomes das filas. |
| `WORKER_CONCURRENCY` | Quantidade de tarefas processadas simultaneamente por worker. |
| `TASK_MAX_ATTEMPTS` | Número máximo de tentativas de processamento de uma tarefa. |
| `TASK_BACKOFF_MS` | Atraso inicial utilizado na estratégia de backoff. |
| `TASK_STALE_MS` | Limite de tempo para considerar uma tarefa em processamento como obsoleta. |
| `TASK_RESULT_TTL_HOURS` | Tempo de retenção do resultado de uma tarefa. |
| `HOST` | Interface de rede na qual a API escuta. |
| `PORT` | Porta HTTP da API. |
| `JWT_SECRET` | Segredo privado utilizado para assinar tokens JWT. |
| `JWT_ACCESS_EXPIRES` | Tempo de validade do access token. |
| `REFRESH_TTL_MINUTES` | Validade do refresh token em minutos. |
| `BCRYPT_COST` | Custo utilizado no hash de senhas. |
| `LOGIN_RATE_LIMIT_MAX` | Limite de tentativas de login por IP e usuário. |
| `CORS_ORIGINS` | Origens autorizadas para chamadas CORS, separadas por vírgula. |
| `ANALYTICS_SCHEDULE_ENABLED` | Habilita ou desabilita o agendamento recorrente de análises. |
| `ANALYTICS_SCHEDULE_CRON` | Expressão cron do agendamento analítico. |
| `ANALYTICS_SCHEDULE_TIMEZONE` | Fuso horário utilizado no agendamento, por exemplo `America/Sao_Paulo`. |
| `DB_ALLOW_PUBLIC_KEY_RETRIEVAL` | Opção relacionada à recuperação da chave RSA do MySQL 8; avalie os riscos antes de habilitá-la em conexões remotas sem TLS. |

`TEST_DATABASE_URL` e `TEST_REDIS_URL` devem apontar exclusivamente para recursos de teste. A suíte de integração pode limpar dados desses recursos.

### Frontend

Crie `frontend/.env` a partir de `frontend/.env.example`.

| **Variável** | **Descrição** | **Valor padrão** |
|---|---|---|
| `VITE_API_URL` | Caminho-base utilizado pelo cliente HTTP do frontend. | `/api/v1` |

Não coloque segredos ou credenciais privadas em variáveis `VITE_*`, pois elas podem ser incluídas no bundle disponibilizado ao navegador.

---

## Bancos de Dados e Docker Compose

O arquivo `docker-compose.yml` inicia:

- **MySQL 8** — banco principal da aplicação, publicado localmente na porta `3306`.
- **Redis 7.4** — serviço utilizado pelo BullMQ, publicado localmente na porta `6379`.

O script `docker/init.sql` cria o banco reservado aos testes quando o volume do MySQL é inicializado pela primeira vez.

Cuidados importantes:

- O script de inicialização do MySQL não é executado novamente automaticamente quando o volume já existe.
- `docker compose down` interrompe e remove os contêineres, mas mantém os volumes.
- Evite `docker compose down -v`: esse comando remove os volumes e pode apagar os dados persistidos.
- Não utilize o banco principal nos testes de integração.
- Não exponha MySQL ou Redis diretamente à internet.

---

## Execução e Scripts

### Backend

Execute os comandos dentro de `backend/`.

| **Comando** | **Finalidade** |
|---|---|
| `npm ci` | Instala as dependências conforme o lockfile. |
| `npm run dev` | Inicia a API em modo de desenvolvimento. |
| `npm run worker` | Inicia o worker de processamento assíncrono. |
| `npm run build` | Compila o backend. |
| `npm start` | Inicia a API compilada. |
| `npm run start:worker` | Inicia o worker compilado. |
| `npm run db:generate` | Gera o cliente Prisma. |
| `npx prisma migrate deploy` | Aplica as migrações versionadas. |
| `npm run db:migrate` | Cria/aplica migrações no fluxo de desenvolvimento. |
| `npm run db:seed` | Insere dados demonstrativos. |
| `npm run db:test:prepare` | Prepara o banco de integração após validar o sufixo `_test`. |
| `npm test` | Executa os testes unitários. |
| `npm run test:integracao` | Executa os testes de integração. |
| `npm run typecheck` | Verifica os tipos TypeScript. |

### Frontend

Execute os comandos dentro de `frontend/`.

| **Comando** | **Finalidade** |
|---|---|
| `npm ci` | Instala as dependências conforme o lockfile. |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite. |
| `npm run build` | Verifica os tipos e gera o build de produção. |
| `npm run preview` | Disponibiliza uma prévia local do build. |
| `npm run typecheck` | Verifica os tipos TypeScript. |
| `npm test` | Executa os testes do frontend. |

---

## Testes e Validação

Execute os testes a partir das respectivas pastas.

### Backend

```bash
cd backend
npm test
npm run typecheck
npm run test:integracao
npm run build
```

Antes dos testes de integração:

1. Configure `TEST_DATABASE_URL` para um banco dedicado cujo nome termine em `_test`.
2. Prepare as migrações desse banco com `npm run db:test:prepare`.
3. Configure `TEST_REDIS_URL` para uma base Redis isolada.
4. Confirme que as variáveis não apontam para desenvolvimento ou produção.

A suíte pode limpar dados do banco de teste. Não a execute se não for possível confirmar os destinos configurados.

### Frontend

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

---

## Acesso à Aplicação e à API

Com os serviços iniciados:

| **Recurso** | **Endereço local** | **Finalidade** |
|---|---|---|
| **Frontend** | `http://localhost:5173` | Interface web do GreenCode. |
| **API REST** | `http://127.0.0.1:3000` | Endpoints internos e públicos. |
| **Swagger UI** | `http://127.0.0.1:3000/docs` | Explorar e testar os endpoints documentados. |
| **OpenAPI** | `http://127.0.0.1:3000/openapi.json` | Documento OpenAPI da API. |
| **Health check** | `http://127.0.0.1:3000/api/v1/saude` | Verificar a disponibilidade da API e a conexão com o banco. |

As rotas de negócio utilizam o prefixo `/api/v1`. A API pública utiliza o agrupamento `/api/v1/public`. As operações internas protegidas exigem JWT; as operações públicas exigem uma chave de API com as permissões correspondentes.

---

## Integração Pública por Chave de API

A API pública foi criada para permitir a integração de organizações parceiras sem compartilhar as credenciais dos usuários internos.

O fluxo de utilização é:

1. Um administrador autenticado cria uma chave de API vinculada a uma organização.
2. A chave é apresentada no momento da criação; o banco armazena somente seu hash.
3. O parceiro envia a chave no cabeçalho `x-api-key` das chamadas públicas.
4. A API verifica se a chave está ativa, se não expirou e se possui a permissão necessária.
5. O controle de requisições limita o volume de chamadas.

Exemplo de consulta pública de lotes:

```bash
curl http://127.0.0.1:3000/api/v1/public/lotes \
  -H "x-api-key: gcp_live_SUA_CHAVE"
```

Exemplo de consulta de rastreabilidade:

```bash
curl http://127.0.0.1:3000/api/v1/public/equipamentos/123/rastreabilidade \
  -H "x-api-key: gcp_live_SUA_CHAVE"
```

A chave deve ser tratada como segredo. Guarde-a em local seguro e não a publique em repositórios, capturas de tela ou logs.

### Solicitação de relatório analítico pelo parceiro

Uma chave com a permissão `ANALISES_LEITURA` também pode solicitar um relatório completo ou uma análise específica. A organização é obtida da chave, sem aceitar `organizacaoId` enviado pelo parceiro.

```bash
curl -X POST http://127.0.0.1:3000/api/v1/public/analises \
  -H "x-api-key: gcp_live_SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: relatorio-parceiro-2026-01" \
  -d '{"tipo":"ANALISE_COMPLETA","inicio":"2026-01-01T00:00:00.000Z","fim":"2026-12-31T23:59:59.999Z"}'
```

A resposta HTTP 202 informa `statusUrl` para polling em `GET /api/v1/public/tarefas/:id` e `downloadUrl` para obter o resultado JSON quando a tarefa estiver concluída. O acesso à tarefa é restrito à mesma organização e à mesma chave de API que a criou.

---

## Processamento Assíncrono

Relatórios e análises que demandam processamento em segundo plano são registrados como tarefas. A API retorna um identificador para acompanhamento, enquanto o worker executa o processamento por meio da fila BullMQ/Redis.

Estados possíveis de uma tarefa:

- `PENDENTE`
- `PROCESSANDO`
- `CONCLUIDA`
- `FALHOU`
- `CANCELADA`

O acompanhamento é realizado por consulta periódica (*polling*) ao endpoint de status da tarefa. Quando o processamento termina e o resultado ainda está dentro do período de retenção, a API disponibiliza o resultado e/ou o endereço de download.

**Importante:** iniciar somente a API não processa as tarefas. Mantenha o Redis disponível e execute o worker em processo separado.

---

## Documentação Complementar

Os documentos abaixo detalham regras, arquitetura e decisões do projeto:

- [`backend/README.md`](backend/README.md) — configuração do backend, variáveis, testes e exemplos de chamadas.
- [`frontend/README.md`](frontend/README.md) — configuração, autenticação, navegação e módulos da interface.
- [`docs/Regras_de_Negocio.md`](docs/Regras_de_Negocio.md) — regras funcionais do sistema.
- [`docs/Documento_Tecnico.md`](docs/Documento_Tecnico.md) — arquitetura, fórmulas, segurança, filas e limitações.
- [`docs/DECISOES.md`](docs/DECISOES.md) — decisões arquiteturais.
- [`docs/ENTENDENDO_AV3.md`](docs/ENTENDENDO_AV3.md) — contexto e evolução da AV2 para a AV3.

---

## Segurança e Cuidados Operacionais

- Não versione nem compartilhe arquivos `.env`, senhas, tokens JWT ou chaves de API.
- Utilize credenciais fortes e exclusivas em ambientes compartilhados.
- Não execute o seed em produção ou em bancos que contenham dados que devam ser preservados.
- Antes de aplicar migrações, confira `DATABASE_URL` e o banco de destino.
- Antes de executar testes de integração, confirme `TEST_DATABASE_URL` e `TEST_REDIS_URL`.
- Não exponha MySQL ou Redis publicamente.
- Em produção, utilize TLS, regras de rede restritivas, backups e gerenciamento seguro de segredos.
- A autorização efetiva deve permanecer no backend; esconder opções no frontend não é uma medida de segurança suficiente.
- Os resultados de previsão de vida útil são exploratórios e dependem da quantidade e da qualidade dos dados históricos. Não devem ser interpretados como garantia técnica.
- O resultado das tarefas possui retenção configurável por `TASK_RESULT_TTL_HOURS`; após a expiração, o payload pode deixar de estar disponível.

---

## Solução de Problemas

| **Sintoma** | **Causa provável** | **O que verificar** |
|---|---|---|
| API encerra ao iniciar com erro de conexão | MySQL parado, credenciais incorretas ou migrações pendentes | Confira `DATABASE_URL`, o serviço MySQL e execute `npx prisma migrate deploy`. |
| Tarefas permanecem pendentes | Redis indisponível ou worker não iniciado | Confira `REDIS_URL` e mantenha `npm run worker` em execução. |
| Frontend apresenta erro de conexão com a API | Backend parado ou proxy do Vite não alcança a porta `3000` | Inicie a API e confira a configuração do Vite. |
| Telas retornam 404 apesar do login | Prefixo `/api/v1` repetido nos caminhos das chamadas | Os caminhos em `frontend/src/features/*/api.ts` devem ser relativos ao `baseURL`, por exemplo `/lotes`. |
| Erro de CORS no navegador | Origem do frontend não autorizada | Em execução fora do proxy local, configure `CORS_ORIGINS` com a origem exata e confiável. |
| `ER_CANNOT_RETRIEVE_RSA_KEY` | Conexão remota MySQL 8 com `caching_sha2_password` sem TLS | Prefira TLS; avalie `DB_ALLOW_PUBLIC_KEY_RETRIEVAL` somente entendendo a implicação de segurança. |
| Tabelas não encontradas após migração em Linux | Diferença entre maiúsculas e minúsculas nos nomes das tabelas | Confira a capitalização dos nomes nas migrações e no schema. |

---
