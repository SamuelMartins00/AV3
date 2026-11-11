# Regras de Negócio — AV2 / Logítica Green

> Este documento descreve regras identificadas no código presente no repositório.

## 1. Usuários, autenticação e autorização

- O login (`Usuario.usuario`) é único. A conta contém nome de exibição, hash de senha, papel, estado ativo, versão de segurança e último acesso. Fonte: modelo Prisma `Usuario` e restrição única no banco.
- Papéis existentes: `ADMINISTRADOR`, `OPERADOR_CADASTRO`, `GESTOR_ALMOXARIFADO` e `AUDITOR`.
- A gestão administrativa de usuários exige autenticação e papel `ADMINISTRADOR`. `/usuarios/me` e alteração do próprio nome exigem autenticação.
- Nome de exibição é aparado e deve ter de 2 a 100 caracteres. Listagem: página padrão 1, limite padrão 20 e limite máximo 100.
- Senhas são armazenadas com bcrypt. Criação/redefinição exige 8–72 caracteres. Criar ou promover administrador exige confirmação da senha atual do administrador.
- Desativação, reativação, redefinição de senha e alteração de papel revogam refresh tokens ativos. Operações de mudança de papel/situação e redefinição incrementam a versão de segurança conforme o código.
- A aplicação impede desativar o último administrador ativo, alterar o papel de outro administrador e redefinir a própria senha pelo endpoint administrativo.
- **Exclusão de usuário implementada neste trabalho:** somente administrador; não permite autoexclusão nem excluir o último administrador ativo. A exclusão e o evento `EXCLUIR_USUARIO` são gravados na mesma transação. Refresh tokens relacionados são removidos pela relação `onDelete: Cascade`. O journal guarda o responsável como texto, sem FK para a conta excluída.
- Eventos de segurança de autenticação são best-effort: falha no journal não reverte a operação de autenticação. Eventos de negócio que usam `registrarJournal(tx, ...)` dentro da transação são atômicos com a alteração correspondente.

**Limites:** o modelo contém `versaoSeguranca`; a invalidação de access tokens depende também da validação feita pelo plugin/fluxo de autenticação. A política de autoexclusão foi adotada para evitar perda da conta do administrador autenticado. Se o negócio desejar outra política, ela precisa ser decidida explicitamente.

## 2. Organizações e contratos

- CNPJ de organização é único. Organização possui razão social, endereço, dados de contato, data de cadastro, estado ativo e versão.
- Uma organização possui no máximo um contrato associado pelo campo único `Contrato.organizacaoId`; a relação usa `onDelete: Restrict`.
- Contrato armazena datas de assinatura/vencimento, cláusulas JSON, valor mensal decimal, renovação automática, duração da renovação, encerramento/motivo e versão.
- Há operações de criação, renovação, encerramento, correção retroativa de encerramento e reativação de organização. A reativação passa pelas condições de contrato implementadas no serviço.
- Operações de renovação automática possuem estados, tentativas, janelas de reivindicação, próxima tentativa e chave única por contrato/vencimento original. A execução efetiva e os critérios de retry/intervenção manual dependem do serviço que processa essas operações; a mera existência do indicador `renovacaoAutomatica` não prova que o contrato será renovado sem falhas.

## 3. Lotes

- Lote pertence a uma organização existente e contém data de entrada, nota fiscal, transportadora, observações opcionais, status e versão. A relação com organização usa `onDelete: Restrict`.
- Estados de lote: `RECEBIDO`, `EM_TRIAGEM`, `TRIAGEM_CONCLUIDA`, `ENCAMINHADO` e `FINALIZADO`.
- Existem endpoints para criar/listar/consultar lotes, adicionar equipamentos e concluir triagem do lote.
- A posição do equipamento é única dentro do lote (`@@unique([loteId, posicaoNoLote])`).
- **Cancelamento de lote: não implementado nas rotas identificadas.** Não inferir política de cancelamento sem decisão explícita.
- **Exclusão física de lote:** `DELETE /api/v1/lotes/:id` é permitida para `ADMINISTRADOR` e `GESTOR_ALMOXARIFADO` somente quando o lote está em `RECEBIDO` e não possui equipamentos vinculados. Lote inexistente retorna 404; estado incompatível, vínculos ou conflito concorrente retornam 409. A verificação é feita no service/repository e a FK `Lote.organizacao` com `onDelete: Restrict` continua protegendo a integridade.
- A exclusão não apaga equipamentos automaticamente. Um lote com qualquer equipamento vinculado não pode ser excluído, mesmo que os equipamentos ainda não tenham histórico.

## 4. Equipamentos, triagem e baixa definitiva

- Equipamento possui código de barras interno único, lote, posição, tipo, marca, modelo, ano de fabricação, estado físico, status de rastreamento, resultado de triagem, peso e versão.
- Tipos, estados físicos, status de rastreamento e resultados de triagem são enums definidos no Prisma.
- **Estado físico** (condição do item), **status de rastreamento** (etapa operacional) e **resultado de triagem** (destinação indicada) são conceitos separados.
- Triagem individual pode registrar resultado, responsável, data/hora e justificativa. A triagem de lote possui endpoint próprio.
- Baixa definitiva possui campos próprios para data/hora, responsável e justificativa; a rota exige administrador e a implementação registra controle de versão e auditoria.
- Existem rotas de consulta/histórico, alteração de estado físico, alteração de status, movimentação, triagem individual e baixa definitiva.
- As regras de transição entre estados dependem dos validadores e serviços; não se deve presumir que todas as combinações dos enums sejam transições válidas.
- **Exclusão física de equipamento:** `DELETE /api/v1/equipamentos/:id` é permitida para `ADMINISTRADOR` e `GESTOR_ALMOXARIFADO` apenas quando o equipamento permanece no estado inicial (`AGUARDANDO_TRIAGEM` e `AGUARDANDO_AVALIACAO`), não possui campos de triagem/baixa preenchidos, movimentações nem eventos operacionais no journal que identifiquem o equipamento. A operação não é baixa definitiva nem altera o estado operacional.
- Equipamentos com triagem, mudança operacional registrada, movimentação, desmontagem ou baixa definitiva são preservados e a exclusão é bloqueada com HTTP 409. Equipamento inexistente retorna 404.
- A exclusão de equipamento não exclui o lote pai. A FK `Movimentacao.equipamento` usa `onDelete: Restrict`; se houver uma movimentação que escape à verificação prévia, a restrição do banco bloqueia a exclusão.

## 4.1 Avaliações de recuperação

- A rota `POST /api/v1/equipamentos/:id/avaliacoes-recuperacao` exige autenticação e os papéis `ADMINISTRADOR` ou `GESTOR_ALMOXARIFADO`; auditor e operador de cadastro não podem registrar avaliações.
- O corpo aceita somente `material`, `valorEstimado` e `observacao` opcional. Campos como `responsavel` e `estadoFisicoSnapshot` são rejeitados; o responsável vem do usuário autenticado e o snapshot é capturado no servidor.
- A avaliação só pode ser criada quando `resultadoTriagem` já contém uma decisão diferente de `AGUARDANDO_AVALIACAO`. Valor `NULL` também representa ausência de triagem concluída e é recusado com HTTP 409.
- Cada avaliação registra `estadoFisicoSnapshot` e `valorEstimado` como fotografia e estimativa no instante do cadastro. `valorRealizado` permanece independente e nulo até que exista realização financeira efetiva; uma estimativa nunca deve ser interpretada como receita realizada.
- Não existe unicidade por par equipamento/material: avaliações repetidas para o mesmo material e equipamento são permitidas e preservadas como registros históricos independentes.
- A criação da avaliação e o evento `CRIAR_AVALIACAO_RECUPERACAO` no journal são confirmados na mesma transação. Falha na auditoria reverte a criação.
- A operação usa compare-and-swap sobre `Equipamento.versao`: a versão e o resultado de triagem observados precisam continuar iguais na escrita condicional, que incrementa a versão antes da criação. Isso serializa o cadastro contra operações concorrentes de triagem e alteração do estado físico que também respeitam a versão. Conflito retorna HTTP 409; o cliente deve recarregar o equipamento e decidir se tenta novamente.
- Equipamento inexistente retorna HTTP 404; corpo inválido é rejeitado pelo schema Fastify (HTTP 400). Propriedades adicionais são detectadas em `preValidation`, antes da validação automática, para impedir que a configuração `removeAdditional` do Ajv as descarte silenciosamente; a resposta também é HTTP 400. Material vazio após normalização é erro de domínio HTTP 422; ausência de autenticação retorna 401 e papel sem permissão retorna 403.

## 5. Movimentações e rastreabilidade

- Cada movimentação referencia um equipamento existente e guarda data/hora, origem, destino, responsável e observação opcional. A relação usa `onDelete: Restrict`.
- Há consulta de histórico do equipamento e movimentações. A leitura do histórico permite administrador, gestor e auditor; movimentações operacionais são restritas a administrador/gestor conforme as rotas.
- Quando alteração de negócio e journal são feitos na mesma transação, ambos confirmam ou falham juntos.
- Origem e destino são texto, não referências a um catálogo de locais. Não presumir que localização atual seja sempre derivada da última movimentação sem confirmar a implementação da consulta específica.

## 6. Relatórios

- Existem relatórios por organização/período, por status de equipamentos e financeiro por período. As rotas são restritas a administrador e auditor.
- O relatório financeiro aplica as condições temporais e de vigência/encerramento presentes no repositório.
- Valores monetários são armazenados em campos `Decimal`.

## 7. Configuração global

- Há registro de configuração global com `id=1`, alíquota de impostos, coeficiente de depreciação e valor-base de depreciação.
- Defaults do modelo: alíquota `0.18`, coeficiente `0.2`, valor-base `1000`.
- Migrations impõem limites para os parâmetros e a migration `20261026160000_config_valor_base_positivo` exige valor-base maior que zero.
- Leitura e alteração são rotas separadas; a alteração exige administrador.
- A restrição SQL só vale em cada ambiente depois que a migration correspondente tiver sido aplicada naquele banco.

## 8. Auditoria e integridade

- `JournalTransacao` guarda timestamp, operação, entidade, snapshots JSON antes/depois e responsável textual.
- Existe endpoint paginado de leitura do journal com filtros definidos pelo schema/serviço, restrito a administrador/auditor.
- `registrarJournal(tx, ...)` grava na transação de negócio; se falhar, a transação deve falhar. Eventos de segurança de autenticação são best-effort e podem faltar se o journal não estiver disponível.
- Tokens, senhas e hashes não devem ser gravados no journal.
- Relações de organização/contrato, organização/lote, lote/equipamento e equipamento/movimentação usam restrições referenciais para evitar remoção em cascata de dados operacionais.
- Exclusões de lote/equipamento permitidas são registradas como `EXCLUIR` no journal dentro da mesma transação da exclusão. Se a gravação do journal falhar, a transação não deve confirmar a remoção. O snapshot anterior é preservado no journal como JSON; não há FK do journal para esses modelos.
- Como o responsável do journal é texto e não FK, a auditoria mantém o nome do ator após excluir a conta, mas não oferece vínculo relacional com o usuário original.

## 9. Validações e concorrência

- Schemas Fastify definem tipos, campos obrigatórios, limites, formatos e propriedades permitidas nas rotas onde estão registrados.
- IDs administrativos de usuário devem seguir o padrão textual de inteiro positivo. Paginação de usuários segue `page >= 1` e `1 <= limit <= 100`.
- O banco protege unicidade de login, CNPJ, código de barras interno e posição no lote, além das relações declaradas.
- Operações que alteram o conjunto de administradores bloqueiam a linha de controle de `ConfiguracaoGlobal` e usam transações. Conflitos concorrentes reconhecidos são convertidos em HTTP 409.
- Exclusão física não é uma regra geral para entidades operacionais. Lotes só podem ser excluídos vazios e em estado inicial; equipamentos só podem ser excluídos sem histórico operacional. A exclusão de usuário segue política específica documentada na seção 1.


## 10. Camada analítica

As regras abaixo descrevem o comportamento do serviço `AnalisesService` e de seus repositórios no código desta versão.

### 10.1 Parâmetros comuns

- As análises aceitam `organizacaoId` opcional, `inicio` e `fim` opcionais e `limiteAmostra` opcional.
- Quando informadas, as datas precisam ser válidas; `inicio` não pode ser posterior a `fim`.
- A janela máxima entre `inicio` e `fim` é de 366 dias.
- `limiteAmostra` aceita inteiros entre 3 e 10.000; o padrão do serviço é 10.000.
- Cada execução persiste um novo `ResultadoAnalitico`, com tipo, título, descrição, dados JSON, parâmetros, período e versão do modelo (`1.0.0`). A consulta histórica não recalcula automaticamente os resultados antigos.
- A API interna exige JWT e papel `ADMINISTRADOR` ou `AUDITOR` para executar, consultar, alterar metadados e excluir resultados analíticos. A execução é enfileirada e responde HTTP 202; a consulta do resultado é feita posteriormente.
- A atualização do resultado altera título/descrição, não recalcula os dados analíticos. A exclusão remove o registro histórico selecionado; portanto, deve ser tratada como operação administrativa deliberada.

### 10.2 Eficiência operacional

- A unidade é hora por lote.
- Cada observação válida corresponde a um lote com `triagemConcluidaEm` não nulo e não anterior a `dataEntrada`.
- Duração = `(triagemConcluidaEm - dataEntrada) / 3.600.000`, em horas.
- O resultado apresenta quantidade de observações, registros ignorados, média, mínimo, máximo e indicação de amostra suficiente (`>= 3`) ou insuficiente.
- Não existe atribuição confiável do tempo agregado a um operador; a análise não deve ser interpretada como produtividade individual.

### 10.3 Rentabilidade de equipamentos

- As avaliações são agrupadas por tipo, estado físico capturado no snapshot, marca e modelo.
- O serviço calcula separadamente a média de `valorEstimado` e a média de `valorRealizado`, com suas respectivas quantidades.
- Valores negativos ou não finitos são desconsiderados nos agregados.
- Estimativa não equivale a receita. Somente `valorRealizado` preenchido participa do agregado realizado.
- O nome “rentabilidade” é uma classificação funcional da análise; o cálculo atual não deduz custos, despesas, tributos ou margem de lucro. Não interpretar as médias como lucro líquido ou ROI.

### 10.4 Vida útil remanescente

- Método implementado: regressão linear simples por equipamento, usando `valorAtual` em função do tempo decorrido em dias desde a primeira observação do conjunto consultado.
- São necessárias ao menos três observações e variação temporal positiva.
- A inclinação é calculada por mínimos quadrados: `b = Σ((x - média(x))(y - média(y))) / Σ((x - média(x))²)`; intercepto `a = média(y) - b*média(x)`.
- Coeficiente de determinação: `R² = 1 - SSE/SST`; quando `SST = 0`, R² é nulo.
- Se a inclinação for negativa e o último valor atual for positivo, a estimativa é `dias = valorAtualMaisRecente / -b`. Caso contrário, não há previsão numérica.
- Falta de amostra, datas sem variação, tendência não decrescente e valor atual não positivo impedem a previsão.
- Falhas e custos de reparo são apresentados como contexto descritivo, não entram como variáveis preditoras.
- A estimativa representa dias até valor depreciado zero segundo a tendência observada, não vida física/técnica garantida. Não incorpora intensidade de uso, obsolescência, condições ambientais ou especificações do fabricante. R² não prova causalidade.

## 11. Chaves e API pública

- O gerenciamento de chaves fica em `/api/v1/chaves-api` e exige JWT com papel `ADMINISTRADOR`.
- A chave é vinculada a uma organização ativa e recebe uma ou mais permissões do enum `PermissaoChaveApi`.
- O segredo é gerado aleatoriamente, exibido apenas na resposta de criação e armazenado no banco somente como hash SHA-256; o prefixo é mantido para identificação operacional.
- A chave pode ser expirada, revogada e rotacionada conforme as rotas administrativas. O segredo original não pode ser recuperado após a criação.
- A API pública fica sob `/api/v1/public`, autentica por `x-api-key` e restringe os dados à organização vinculada à chave.
- Permissões implementadas: `LOTES_ESCRITA` para criar lote; `LOTES_LEITURA` para listar/consultar lotes; `RASTREABILIDADE_LEITURA` para rastreabilidade; `ANALISES_LEITURA` para consultar resultados analíticos. Outros valores do enum não significam, por si só, que exista endpoint público correspondente.
- O limite configurado nas rotas públicas é 120 requisições por minuto por chave (identificada por hash do valor apresentado) ou por IP quando não há cabeçalho de chave. O limitador está registrado no escopo público.
- Chave ausente/inválida: 401; permissão insuficiente: 403; recurso fora da organização ou inexistente: 404; limite excedido: resposta de erro do rate limit.
- O corpo de criação pública de lote não recebe `organizacaoId`; a organização é sempre obtida da chave autenticada.

## 12. Tarefas assíncronas e estados

- Tipos persistidos: `GERACAO_RELATORIO`, `ANALISE_EFICIENCIA`, `ANALISE_RENTABILIDADE`, `ANALISE_VIDA_UTIL` e `ANALISE_COMPLETA`.
- Estados persistidos: `PENDENTE`, `PROCESSANDO`, `CONCLUIDA`, `FALHOU` e `CANCELADA`.
- A criação persiste primeiro em MySQL e tenta publicar no BullMQ/Redis. Se Redis falhar na publicação, a tarefa permanece `PENDENTE`; a reconciliação do worker tenta publicá-la novamente.
- O cabeçalho opcional `Idempotency-Key` é escopado ao usuário ou à agenda e armazenado como hash. Reutilização com mesmo conteúdo retorna a tarefa existente; conteúdo diferente retorna 409.
- O worker reivindica condicionalmente tarefas pendentes/em processamento no MySQL. Uma tarefa cancelada não deve iniciar por um job atrasado.
- O retry do BullMQ usa `TASK_MAX_ATTEMPTS` e backoff exponencial iniciado em `TASK_BACKOFF_MS`. Após esgotar tentativas, o estado é `FALHOU`; durante nova tentativa, volta a `PENDENTE`.
- Somente tarefas `PENDENTE` aceitam alteração de parâmetros ou cancelamento. Tarefas em processamento ou terminais retornam conflito (409) nessas operações.
- Exclusão física de tarefa é permitida somente nos estados terminais `CONCLUIDA`, `FALHOU` ou `CANCELADA`. O resultado JSON fica no MySQL e expira conforme `TASK_RESULT_TTL_HOURS`; o worker limpa o payload expirado.
- Consulta de tarefa e download são endpoints internos protegidos por JWT e papel `ADMINISTRADOR` ou `AUDITOR`.

## 13. Agendamento recorrente de análises

- O agendamento é registrado somente pelo processo worker e é controlado por `ANALYTICS_SCHEDULE_ENABLED`.
- Quando habilitado, o scheduler BullMQ usa identificador estável `greencode-analises-completas-diarias`, expressão cron e fuso IANA configuráveis. O padrão de configuração no código é `0 2 * * *` e `America/Sao_Paulo`; a variável de habilitação é falsa por padrão.
- Cada ocorrência cria uma tarefa `ANALISE_COMPLETA` com chave idempotente derivada do ID do job recorrente. A execução analítica em si ocorre na fila de tarefas.
- A inicialização com identificador estável evita registrar schedulers diferentes por instância; a garantia operacional depende do Redis compartilhado e do comportamento de scheduler do BullMQ.
- Logs registram início, despacho concluído ou falha do despacho. A duração registrada nesse log é a duração do despacho para a fila, não o tempo total de cálculo das três análises. A duração do processamento da tarefa é persistida em `TarefaAssincrona.duracaoMs`.

## 14. Limitações e decisões futuras

- A API pública atual não expõe criação pública de tarefas analíticas/relatórios; a criação de tarefas documentada nesta versão é interna, autenticada por JWT.
- `TAREFAS_LEITURA`, `TAREFAS_ESCRITA`, `EQUIPAMENTOS_LEITURA` e `RELATORIOS_LEITURA` existem no enum de permissões, mas não devem ser anunciadas como operações públicas disponíveis sem rotas correspondentes.
- O limite de 120/min é configuração fixa no plugin da rota pública, não variável de ambiente nem política individual por plano/parceiro.
- O armazenamento do resultado é JSON no MySQL; não há armazenamento de objetos/arquivos externo implementado nesta versão.
- Webhooks, dashboards de métricas, tracing distribuído, limites configuráveis por parceiro, exportação CSV/PDF e modelos preditivos com variáveis adicionais são decisões futuras, não capacidades confirmadas.
