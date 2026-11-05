# GreenCode --- Entendendo a AV3 e o plano de evolução da AV2

## 1. Objetivo

Este documento explica o que a AV3 pede e
como o GreenCode, atualmente baseado na AV2, será evoluído para atender
aos novos requisitos.

**Cerne:** não vou reconstruir o sistema. Vou preservar a
base da AV2 e acrescentar três capacidades: análise de dados,
integração externa por API pública e processamento assíncrono.

## 2. Ponto de partida: o que já existe na AV2

A AV2 estabeleceu uma aplicação servidora com Node.js, TypeScript,
Fastify, Prisma ORM e MySQL. O projeto também possui autenticação de
usuários, autorização por papéis, documentação Swagger/OpenAPI, testes
automatizados e organização modular.

Principais módulos existentes:

  |Módulo           | Responsabilidade|
  |---|---|
  |`auth`        |   Autenticação e sessões de usuários              |
  |`usuarios`    |   Gestão de usuários e papéis                     |
  |`organizacoes`|   Organizações clientes                           |
  |`lotes`       |   Recebimento e acompanhamento de lotes           |
  |`equipamentos`|   Cadastro, triagem, rastreamento e baixa         |
  |`relatorios`  |   Relatórios operacionais e financeiros existentes|
  |`auditoria`   |   Registro de operações                           |
  |`configuracao`|   Parâmetros globais                              |

O Swagger já existe na AV2. Então, vou ampliá-lo para documentar os
novos endpoints, e não criar uma documentação paralela.

### Dados existentes que serão aproveitados

O banco já armazena organizações, contratos, lotes, datas de entrada,
equipamentos, tipo, marca, modelo, ano de fabricação, estado físico,
peso, status de rastreamento, dados da triagem, responsável pela triagem
e movimentações.

Essas informações são a base das análises. Entretanto, algumas análises
exigem dados históricos que ainda não são registrados de forma
estruturada.

## 3. O que a AV3 solicita

A AV3 pretende transformar o GreenCode de um sistema que registra
operações em uma plataforma que também gera conhecimento a partir dos
dados, permite integração com parceiros e executa trabalhos demorados em
segundo plano.

A atividade possui três pilares.

## 3.1 Pilar 1 --- Camada analítica

A camada analítica deverá transformar os dados do sistema em métricas e
informações úteis para a tomada de decisão. O enunciado solicita pelo
menos três categorias de análise.

### A. Eficiência operacional

**Pergunta que responde:** quanto tempo a triagem leva e onde estão os
gargalos?

Deve calcular o tempo médio de processamento dos lotes, desde a entrada
até a conclusão da triagem, identificando gargalos e variações entre
operadores ou períodos do ano.

**Dados já existentes:** data de entrada do lote, status do lote, data
da triagem dos equipamentos e responsável pela triagem.

**Ponto a resolver:** o modelo atual registra datas de triagem por
equipamento, porém não possui um campo explícito de data de conclusão da
triagem do lote. Irá precisar definir uma regra consistente para
calcular esse tempo.

### B. Rentabilidade por tipo de equipamento

**Pergunta que responde:** quais equipamentos tendem a gerar maior valor
de recuperação?

A análise deverá estimar o valor médio de recuperação de materiais
considerando tipo, estado físico, marca e modelo do equipamento.

**Dados já existentes:** tipo, estado físico, marca e modelo.

**Dado que falta:** a AV2 não registra de forma estruturada os valores
estimados e efetivamente recuperados. Irá precisar acrescentar esse
histórico para que a análise possa usar dados reais.

### C. Previsão de vida útil remanescente

**Pergunta que responde:** com base no histórico, quando um equipamento
ou grupo de equipamentos provavelmente chegará ao estado inservível?

A AV3 sugere regressão simples ou suavização exponencial, utilizando
histórico de depreciação e falhas. Os resultados deverão ser armazenados
para consulta histórica e comparação entre previsões e realizações
futuras.

**Dados já existentes:** ano de fabricação, estado físico e
configurações relacionadas à depreciação.

**Dados que faltam:** histórico periódico de depreciação e histórico
estruturado de falhas. O sistema deverá começar a registrar esses dados.
Previsões com pouco histórico precisam apresentar suas limitações.

### Organização dos serviços analíticos

Os cálculos devem ser organizados em serviços independentes, acessíveis
por endpoints e por tarefas agendadas em segundo plano. O enunciado cita
`simple-statistics` e `mathjs` para operações estatísticas e `node-cron`
para agendamento. Também permite integrar os cálculos a um worker caso
seja adotada uma fila.

A biblioteca escolhida deverá ser justificada no relatório técnico.

## 3.2 Pilar 2 --- API pública documentada

A AV2 já possui uma API interna. A AV3 solicita uma camada de endpoints
voltada a parceiros externos, permitindo, por exemplo, consultar
rastreabilidade, submeter lotes e solicitar relatórios analíticos.

Requisitos:

1.  **Separação:** endpoints públicos devem ficar separados dos internos
    ou administrativos.
2.  **Versionamento:** utilizar versão explícita, por exemplo
    `/api/v1/public`.
3.  **Chaves de API:** cada parceiro deve possuir uma chave única.
4.  **Permissões:** cada chave terá permissões específicas, como leitura
    de rastreabilidade ou leitura e escrita de lotes.
5.  **Rate limit:** limitar a quantidade de requisições por cliente.
6.  **Documentação:** incluir exemplos de requisição e resposta,
    parâmetros e códigos de erro.

A atividade sugere `@fastify/rate-limit` para limitar requisições e
`@fastify/swagger` para documentação OpenAPI. Como o Swagger já está
presente, vou tentar integrar os novos endpoints à documentação existente.

### Como funcionará uma chave de API

1.  Um fluxo autorizado cria uma chave para uma organização parceira.
2.  A chave original é apresentada ao parceiro no momento da criação.
3.  O banco armazena somente o hash da chave.
4.  Em cada chamada, a API identifica e valida a chave.
5.  O sistema verifica se ela está ativa e possui a permissão
    necessária.
6.  O rate limit controla o volume de chamadas.

A chave de API identifica uma integração externa. Ela não deve ser
confundida com o login e a senha dos usuários internos.

## 3.3 Pilar 3 --- Processamento assíncrono (orquestração de tarefas)

A geração de relatórios para milhares de equipamentos pode demorar.
Manter uma requisição HTTP aberta durante todo esse processamento pode
causar timeout e prejudicar o sistema.

A AV3 propõe utilizar uma fila.

### Fluxo esperado

1.  O parceiro solicita um relatório pela API pública.
2.  A API valida a chave e as permissões.
3.  A aplicação registra a tarefa e a publica na fila.
4.  A API responde imediatamente com um identificador da tarefa.
5.  Um worker consome a tarefa e executa o processamento.
6.  O resultado ou arquivo é armazenado.
7.  O parceiro consulta um endpoint de status.
8.  Quando concluída, a tarefa disponibiliza o resultado ou o download.

A consulta periódica do status é chamada de **polling**. A AV3 também
menciona webhook como alternativa.

### Tecnologias e confiabilidade

O enunciado sugere BullMQ e Redis. O worker executará os jobs. O banco
MySQL continuará armazenando o histórico consultável das tarefas:
Redis/BullMQ coordenam a fila; MySQL mantém os dados persistentes da
aplicação.

Também será necessário definir uma política de retry: número máximo de
tentativas, intervalos, falhas que podem ser repetidas e comportamento
após esgotar as tentativas. Devemos evitar que uma repetição gere
resultados duplicados.

## 4. O que será mantido e o que será acrescentado

### Será reaproveitado

-   Node.js e TypeScript;
-   Fastify;
-   Prisma ORM;
-   MySQL;
-   autenticação e autorização internas;
-   módulos de organizações, lotes e equipamentos;
-   auditoria;
-   relatórios existentes;
-   Swagger/OpenAPI;
-   estrutura modular e testes.

### Será ampliado ou acrescentado

  -----------------------------------------------------------------------
  |Área|                                Mudança|
  |---|---|
  |Banco de dados   | Novas tabelas para históricos, resultados, chaves e tarefas|
  |Prisma           | Novos modelos, enums, relacionamentos e migração incremental|
  |Análises         | Serviços para as três categorias de análise|
  |API pública      | Endpoints externos separados e versionados|
  |Autenticação     | Autenticação de parceiros por chave de API|
  |Autorização      | Verificação das permissões de cada chave|
  |Segurança        | Rate limit por cliente/chave|
  |Filas            | BullMQ e Redis|
  |Worker           | Execução de relatórios e análises em segundo plano|
  |Documentação     | Ampliação do Swagger e relatório técnico|
  |Testes           | Testes de cálculos, permissões, limites e tarefas|
  |Ambiente         | Redis no ambiente de desenvolvimento, por exemplo via Docker Compose|
  -----------------------------------------------------------------------

## 5. Mudanças propostas no banco de dados

A proposta inicial é acrescentar seis modelos. Eles são uma decisão de
implementação para atender aos requisitos, não uma lista de tabelas
literalmente obrigatórias no enunciado.

  ------------------------------------------------------------------------
  Modelo proposto          Finalidade              Relação principal
  ------------------------ ----------------------- -----------------------
  `AvaliacaoRecuperacao`   Registrar valores       Equipamento
                           estimados e             
                           efetivamente            
                           recuperados por         
                           material/equipamento    

  `HistoricoFalha`         Registrar falhas,       Equipamento
                           datas, descrição,       
                           resolução e eventual    
                           custo                   

  `HistoricoDepreciacao`   Guardar avaliações      Equipamento
                           periódicas de           
                           depreciação             

  `ResultadoAnalitico`     Persistir resultados,   Organização, quando
                           parâmetros, período e   aplicável
                           versão do modelo        

  `ChaveApi`               Guardar hash,           Organização
                           identificação,          
                           validade, situação e    
                           permissões da chave     

  `TarefaAssincrona`       Guardar tipo, status,   Organização e, quando
                           parâmetros, tentativas, aplicável, chave de API
                           erros e resultado       
  ------------------------------------------------------------------------

### Cuidados com os dados

-   Não devemos fabricar histórico retroativo de falhas, depreciação ou
    recuperação.
-   O sistema deverá começar a registrar esses dados a partir da
    implantação.
-   Resultados analíticos antigos devem continuar consultáveis.
-   A fila não substitui a tabela de tarefas: cada uma tem uma
    responsabilidade diferente.
-   A modelagem final deve acompanhar os fluxos efetivamente
    implementados.

## 6. Estrutura de pastas planejada

A estrutura da AV2 será preservada. Os novos módulos serão adicionados
dentro de `src/modules`, seguindo o padrão já utilizado no projeto.

``` text
src/
├── modules/
│   ├── analises/
│   │   ├── analises.controller.ts
│   │   ├── analises.repository.ts
│   │   ├── analises.routes.ts
│   │   ├── analises.schemas.ts
│   │   └── analises.service.ts
│   ├── api-publica/
│   │   ├── api-publica.controller.ts
│   │   ├── api-publica.routes.ts
│   │   └── api-publica.schemas.ts
│   ├── chaves-api/
│   │   ├── chaves-api.controller.ts
│   │   ├── chaves-api.repository.ts
│   │   ├── chaves-api.routes.ts
│   │   ├── chaves-api.schemas.ts
│   │   └── chaves-api.service.ts
│   └── tarefas/
│       ├── tarefas.controller.ts
│       ├── tarefas.repository.ts
│       ├── tarefas.routes.ts
│       ├── tarefas.schemas.ts
│       ├── tarefas.service.ts
│       └── tarefas.worker.ts
└── plugins/
    ├── auth.ts
    ├── swagger.ts
    └── rate-limit.ts
```

Também serão acrescentados testes e a configuração do Redis no
`docker-compose.yml`. Essa árvore é uma referência inicial

## 7. Plano de execução

A evolução será incremental. Cada etapa deve deixar o sistema em
condição funcional antes de avançarmos.

### Etapa 1 --- Preparação e banco de dados

-   [ ] Revisar a modelagem dos novos dados.
-   [ ] Atualizar `prisma/schema.prisma`.
-   [ ] Formatar o schema.
-   [ ] Criar migração incremental, sem apagar dados.
-   [ ] Gerar o Prisma Client.
-   [ ] Conferir relacionamentos e campos.

**Entrega:** banco da AV2 ampliado para armazenar os dados necessários à
AV3.

### Etapa 2 --- Registro dos dados históricos

-   [ ] Criar operações para registrar avaliações de recuperação.
-   [ ] Criar operações para registrar falhas.
-   [ ] Criar operações para registrar depreciação.
-   [ ] Definir validações e regras de negócio.
-   [ ] Preservar o histórico sem sobrescrever registros anteriores.

**Entrega:** o sistema começa a acumular dados reais para as análises.

### Etapa 3 --- Camada analítica

-   [ ] Implementar eficiência operacional.
-   [ ] Implementar rentabilidade por tipo de equipamento.
-   [ ] Implementar previsão de vida útil remanescente.
-   [ ] Definir e justificar a técnica estatística.
-   [ ] Persistir resultados em `ResultadoAnalitico`.
-   [ ] Permitir consultar resultados anteriores.
-   [ ] Tratar ausência ou insuficiência de dados.

**Entrega:** serviços analíticos independentes que produzem métricas e
previsões.

### Etapa 4 --- API pública e chaves

-   [ ] Implementar criação, consulta, desativação e revogação de
    chaves.
-   [ ] Armazenar somente o hash da chave.
-   [ ] Associar cada chave a uma organização.
-   [ ] Implementar permissões por chave.
-   [ ] Criar endpoints públicos versionados.
-   [ ] Separar endpoints públicos dos internos.
-   [ ] Aplicar rate limit.
-   [ ] Documentar os endpoints no Swagger.

**Entrega:** parceiros acessam operações autorizadas por uma API
documentada e protegida.

### Etapa 5 --- Fila e processamento assíncrono

-   [ ] Adicionar Redis ao ambiente.
-   [ ] Integrar BullMQ.
-   [ ] Criar o worker.
-   [ ] Implementar solicitação assíncrona de relatórios.
-   [ ] Retornar identificador da tarefa.
-   [ ] Criar endpoint de consulta de status.
-   [ ] Disponibilizar o resultado quando concluído.
-   [ ] Implementar retry e tratamento de falhas.

**Entrega:** relatórios demorados são processados em segundo plano.

### Etapa 6 --- Integração, testes e documentação

-   [ ] Testar os cálculos analíticos.
-   [ ] Testar autenticação e permissões das chaves.
-   [ ] Testar limites de requisição.
-   [ ] Testar criação, execução, conclusão e falha de tarefas.
-   [ ] Testar o fluxo de solicitação e obtenção de relatório.
-   [ ] Atualizar o Swagger.
-   [ ] Escrever o relatório técnico.
-   [ ] Documentar instalação e execução nos sistemas operacionais
    indicados.

**Entrega:** funcionalidades integradas, testadas e documentadas.

## 8. Decisões que deverão ser justificadas no relatório técnico

A AV3 valoriza a justificativa das escolhas. O relatório deverá
explicar:

1.  **Biblioteca estatística:** por que foi escolhida
    `simple-statistics`, `mathjs` ou uma implementação própria.
2.  **Modelagem analítica:** como históricos e resultados são
    armazenados.
3.  **Fila:** por que BullMQ e Redis foram adotados.
4.  **Retry:** qual política é aplicada e como se evita duplicidade.
5.  **Segurança:** como as chaves são geradas, armazenadas, validadas e
    limitadas.
6.  **Escalabilidade:** como a arquitetura poderá evoluir com centenas
    ou milhares de parceiros.
7.  **Compatibilidade:** como o sistema será executado nos sistemas
    operacionais indicados.

As decisões documentadas devem corresponder ao código realmente
implementado.

## 9. Conceitos importantes

  -----------------------------------------------------------------------
  Conceito                            Significado no GreenCode
  ----------------------------------- -----------------------------------
  Sistema transacional                Registra operações, como entrada de
                                      lotes, triagem e movimentações

  Camada analítica                    Processa registros para gerar
                                      indicadores e previsões

  Métrica agregada                    Resume vários registros em um
                                      indicador, como tempo médio de
                                      triagem

  Análise preditiva                   Usa dados históricos e método
                                      estatístico para estimar um
                                      resultado futuro

  API pública                         Interface controlada para sistemas
                                      externos

  API key                             Credencial que identifica e
                                      autoriza uma integração

  Rate limit                          Limite de requisições em
                                      determinado intervalo

  Fila                                Estrutura que organiza trabalhos
                                      para execução posterior

  Worker                              Processo que retira tarefas da fila
                                      e executa o trabalho

  Polling                             Consulta periódica para verificar
                                      se uma tarefa terminou

  Retry                               Nova tentativa após uma falha
                                      considerada recuperável
  -----------------------------------------------------------------------

## 10. O que evitar

-   Não reescrever a aplicação inteira.
-   Não substituir MySQL sem necessidade.
-   Não duplicar o Swagger existente.
-   Não misturar autenticação interna com autenticação de parceiros.
-   Não armazenar chaves em texto puro nem expô-las em logs.
-   Não executar relatórios demorados dentro da requisição HTTP.
-   Não tratar Redis como substituto do banco de dados.
-   Não apresentar previsões como certezas quando os dados forem
    insuficientes.
-   Não inventar dados históricos.
-   Não considerar uma funcionalidade concluída apenas porque sua tabela
    ou endpoint foi criado.

## 11. Critério geral de conclusão

A evolução estará alinhada à AV3 quando o GreenCode:

1.  Produzir as três categorias de análise solicitadas.
2.  Persistir resultados analíticos e permitir consultar seu histórico.
3.  Expor endpoints públicos separados e versionados.
4.  Autenticar parceiros por chaves com permissões específicas.
5.  Aplicar limites de requisição por cliente.
6.  Documentar a API pública no Swagger/OpenAPI.
7.  Processar relatórios demorados por fila.
8.  Permitir consultar o status e obter o resultado das tarefas.
9.  Possuir testes e documentação técnica das decisões.
10. Manter compatibilidade com os sistemas operacionais indicados na
    AV3.

## 12. Base e limites deste planejamento

Este documento foi elaborado com base no enunciado da **Atividade Avaliativa
3** e na estrutura da **AV2** apresentada durante o desenvolvimento.

O enunciado define os objetivos e sugere tecnologias e abordagens. A
estrutura de pastas, os seis modelos adicionais e a ordem de execução
são propostas de implementação para evoluir a base existente; não são
exigências literais do enunciado.

**Regra de trabalho:** implementar uma etapa por vez, preservar o que já
funciona e validar cada acréscimo antes de iniciar o próximo.
