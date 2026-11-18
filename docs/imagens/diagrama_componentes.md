O código abaixo é referente ao diagrama de componentes, caso não seja possível ver a imagem

flowchart TB
    %% ATORES E INTERFACES
    Usuario([Usuário do Sistema])
    Parceiro([Sistema Parceiro])

    subgraph FRONT["FRONTEND - React + TypeScript"]
        UI["Interface Web"]
        ROUTER["React Router"]
        GUARD["Guards de Autorização"]
        AUTH["Auth Context / Sessão"]
        FEATURES["Módulos de Funcionalidades"]
        HTTP["Cliente HTTP - Axios"]
        QUERY["TanStack React Query"]
        DASH["Dashboard e Gráficos - Recharts"]

        UI --> ROUTER
        ROUTER --> GUARD
        GUARD --> AUTH
        ROUTER --> FEATURES
        FEATURES --> QUERY
        QUERY --> HTTP
        FEATURES --> DASH
    end

    subgraph BACK["BACKEND - Node.js + Fastify"]
        APP["App / Fastify"]
        PLUGINS["Plugins de Autenticação JWT e Swagger"]

        subgraph ROTAS["Camada de Rotas e Controllers"]
            R_AUTH["Auth"]
            R_USUARIOS["Usuários"]
            R_ORG["Organizações e Contratos"]
            R_LOTES["Lotes"]
            R_EQUIP["Equipamentos"]
            R_AUDIT["Auditoria"]
            R_CONFIG["Configuração"]
            R_REL["Relatórios"]
            R_ANALISE["Análises"]
            R_CHAVES["Chaves de API"]
            R_PUBLICA["API Pública"]
            R_TAREFAS["Tarefas"]
        end

        subgraph SERVICOS["Camada de Serviços e Regras"]
            S_AUTH["Autenticação e Sessões"]
            S_USUARIOS["Gestão de Usuários"]
            S_ORG["Gestão de Organizações e Contratos"]
            S_LOTES["Gestão de Lotes"]
            S_EQUIP["Gestão de Equipamentos e Triagem"]
            S_AUDIT["Auditoria e Journal"]
            S_CONFIG["Configurações Globais"]
            S_REL["Geração de Relatórios"]
            S_ANALISE["Análises e Indicadores"]
            S_PUBLICA["Autorização de Parceiros"]
            S_TAREFAS["Orquestração de Tarefas"]
        end

        subgraph REPOS["Camada de Repositórios"]
            REPO["Repositories Prisma"]
            MAPPER["Mappers e Schemas"]
        end

        APP --> PLUGINS
        APP --> ROTAS

        ROTAS --> SERVICOS
        SERVICOS --> REPOS
        REPOS --> MAPPER
    end

    subgraph PROCESSAMENTO["PROCESSAMENTO ASSÍNCRONO"]
        PRODUCER["Task Producer"]
        QUEUE["BullMQ - Filas"]
        WORKER["Worker"]
        SCHEDULER["Agendador de Análises"]
    end

    subgraph INFRA["INFRAESTRUTURA"]
        PRISMA["Prisma ORM"]
        MYSQL[("MySQL 8")]
        REDIS[("Redis 7")]
    end

    SWAGGER["Swagger / OpenAPI"]

    Usuario --> UI
    Parceiro --> R_PUBLICA
    HTTP <-->|"HTTP / JSON - API REST"| APP

    PLUGINS --> SWAGGER

    S_TAREFAS --> PRODUCER
    S_ANALISE --> PRODUCER
    S_REL --> PRODUCER
    PRODUCER --> QUEUE
    QUEUE <--> REDIS
    WORKER --> QUEUE
    WORKER --> S_ANALISE
    WORKER --> S_REL
    SCHEDULER --> S_ANALISE
    SCHEDULER --> PRODUCER

    REPO --> PRISMA
    PRISMA <--> MYSQL
    WORKER --> PRISMA

    R_PUBLICA --> S_PUBLICA
    S_PUBLICA --> S_TAREFAS
    S_PUBLICA --> S_LOTES
    S_PUBLICA --> S_EQUIP
