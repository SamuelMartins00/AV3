# GreenCode — Frontend

Aplicação web do GreenCode AV3, construída com React, Vite e TypeScript. O frontend fica isolado em `front/` e consome a API HTTP do backend; não acessa MySQL ou Redis diretamente.

## Requisitos

- Node.js 22.12 ou superior
- npm
- Backend GreenCode em execução na porta `3000` para testar a comunicação com a API

## Instalação

A partir da raiz do repositório:

```bash
cd front
npm install
```

## Variáveis de ambiente

Crie o arquivo `.env` com base no exemplo:

```bash
cp .env.example .env
```

Conteúdo padrão:

```env
VITE_API_URL=/api/v1
```

## Executar em desenvolvimento

```bash
npm run dev
```

O Vite inicia a aplicação e encaminha as requisições iniciadas em `/api` para `http://127.0.0.1:3000`, conforme `vite.config.ts`.

## Verificações

```bash
npm run typecheck
npm run build
```

Para visualizar o build localmente:

```bash
npm run preview
```

## Estrutura

```text
src/
├── app/          # composição da aplicação e providers
├── components/   # componentes compartilhados
├── features/     # módulos organizados por domínio
├── hooks/        # hooks compartilhados
├── lib/          # clientes e configurações de bibliotecas
├── routes/       # definição das rotas
├── styles/       # estilos globais e Tailwind
└── types/        # tipos compartilhados
```

Cada funcionalidade poderá concentrar seus contratos, chamadas HTTP, schemas, hooks e componentes dentro da própria pasta em `features/`.

## Autenticação 

O fluxo de autenticação utiliza os endpoints internos `/auth/*` e `/usuarios/me`:

- `POST /auth/login`, `POST /auth/refresh` e `POST /auth/logout`;
- `GET /auth/me` e `POST /auth/alterar-senha`;
- `GET /usuarios/me` e `PATCH /usuarios/me`.

O access token é mantido somente em memória. O refresh token é mantido em `sessionStorage` para permitir restauração da sessão ao recarregar a página. **Atenção:** `sessionStorage` continua acessível a JavaScript executado na origem; portanto, um XSS pode extrair o refresh token. A proteção definitiva recomendada para produção é migrar o refresh token para cookie `HttpOnly`, `Secure` e `SameSite`, com proteção CSRF no backend.

A renovação é rotativa e single-flight: chamadas concorrentes compartilham a mesma Promise e repetem a requisição original no máximo uma vez. Se a renovação falhar por token inválido ou sessão revogada, a sessão local é limpa; em HTTP 429, os tokens são preservados para uma nova tentativa posterior. O código de HTTP 403 só é tratado como troca obrigatória quando o backend retorna `codigo: "SENHA_ALTERACAO_OBRIGATORIA"`; outros 403 permanecem erros de autorização.

Quando o login informa `senhaAlteracaoObrigatoria: true`, o usuário é encaminhado à tela exclusiva de troca de senha e o frontend não tenta renovar o refresh token. Após a alteração, a sessão local é removida e o usuário retorna ao login, pois o backend invalida todas as sessões. Se a página for recarregada antes de concluir a troca, será necessário autenticar novamente para obter um access token novo: o access token não é persistido e o backend não permite refresh nesse estado.

Respostas `204 No Content` são consumidas sem tentativa de interpretar JSON.

### Testes

```bash
npm test
npm run typecheck
npm run build
```

## Estrutura visual e navegação 

A aplicação possui layout autenticado com sidebar responsiva, cabeçalho de usuário, navegação filtrada pelo papel e rotas protegidas. Os papéis controlam somente a apresentação e a navegação; a API continua sendo responsável pela autorização efetiva.

### Papéis e módulos

- `ADMINISTRADOR`: todos os módulos.
- `OPERADOR_CADASTRO`: organizações e perfil.
- `GESTOR_ALMOXARIFADO`: lotes, equipamentos e perfil.
- `AUDITOR`: equipamentos, relatórios, análises, tarefas, auditoria e perfil.


### Componentes compartilhados

- `components/ui/form-field.tsx`: campo de formulário com estados de erro e dica.
- `components/ui/data-table.tsx`: tabela genérica tipada e estado vazio.
- `components/ui/modal.tsx`: modal acessível com fechamento por Escape e clique externo.
- `components/ui/confirm-dialog.tsx`: confirmação de ações.
- `app/toast-provider.tsx`: notificações de sucesso, erro e informação.

A rota `/403` apresenta a página de acesso negado. Rotas de módulos não permitidos também exibem essa página. Rotas inexistentes exibem a página 404 dentro da área autenticada.

## Organizações e contratos 

O módulo `/organizacoes` integra `GET/POST/PATCH /api/v1/organizacoes`, busca por ID, reativação e os endpoints de contrato (cadastro, renovação, encerramento e encerramento retroativo). A listagem utiliza filtros de razão social, CNPJ e situação, além de paginação. Os detalhes apresentam contatos e dados contratuais como leitura; a edição envia somente `cnpj`, `enderecoCompleto` e `versao` (ou `desativar: true` junto da versão).

As operações que exigem concorrência otimista enviam a versão atual do registro/contrato. O cadastro de contrato não envia versão. A duração da renovação automática é obrigatória quando essa opção é ativada. O encerramento retroativo só é exibido para `ADMINISTRADOR`, além de continuar protegido pelo backend. O hook `useOrganizacaoOpcoes` consome `GET /api/v1/organizacoes/opcoes` para seletores em módulos que precisem referenciar organizações sem expor CNPJ, contatos ou contrato.

## Fluxo operacional principal 

O módulo `/lotes` integra listagem e filtros por período, organização, situação e nota fiscal; cadastro, detalhe, inclusão de equipamentos, conclusão de triagem coletiva e solicitação de exclusão. O seletor de organização consome `GET /api/v1/organizacoes/opcoes`. A API de lotes não expõe paginação, portanto a tela apresenta a coleção retornada pelo servidor sem simular páginas.

O módulo `/equipamentos` integra listagem e filtros, ficha detalhada, histórico de movimentações, histórico de avaliações de recuperação e consulta de depreciação. Também oferece triagem individual, avaliação de recuperação, movimentação, atualização de estado físico/status, baixa definitiva (administrador) e solicitação de exclusão sujeita às regras do servidor.

Os payloads de avaliação de recuperação contêm exclusivamente `material`, `valorEstimado` e, opcionalmente, `observacao`. O responsável e o snapshot do estado físico são atribuídos pelo backend. Não são enviados campos de valor realizado ou data de realização. Avaliações repetidas para o mesmo material não são bloqueadas pelo frontend. A avaliação só é oferecida após a triagem coletiva do lote; o backend mantém a validação definitiva.

As mutações com concorrência otimista usam `versao` lida do detalhe atualizado. A movimentação e o cadastro de avaliação não enviam versão, conforme os schemas do backend. O frontend não implementa a máquina de estados: solicita as operações e apresenta as respostas/erros do servidor. A autorização da baixa definitiva e das demais operações permanece no backend; os papéis no frontend controlam somente a experiência de navegação.

Testes adicionados em `features/lotes/__tests__` e `features/equipamentos/__tests__` cobrem rotas, filtros, payloads, versões e validações de dados.

## Telas administrativas

- **Usuários** (`/usuarios`): listagem paginada e filtros por papel/situação; cadastro, consulta, edição de nome/papel, redefinição de senha, desativação, reativação e exclusão. Criação/promoção de administrador abre reautenticação e envia `senhaAtualAdmin`. A redefinição administrativa de senha avisa sobre a troca obrigatória no próximo login.
- **Configuração** (`/configuracao`): leitura e atualização dos parâmetros globais. A alíquota e o coeficiente são enviados como frações entre 0 e 1 (por exemplo, `0.15` para 15%).
- **Auditoria** (`/auditoria`): consulta paginada do journal, filtros por entidade/operação/responsável/período e modal com snapshots antes/depois. A tela não cria nem exibe identificador de entidade não retornado pela API.
- **Chaves de API** (`/chaves-api`): listagem, consulta, criação, revogação e rotação. O segredo de criação/rotação permanece somente em estado local efêmero para apresentação única; não passa por React Query, cache, URL ou logs. A tela oferece as quatro permissões ativas da API pública e identifica as demais como reservadas.

As operações administrativas continuam sujeitas à autorização e validação do backend. As telas não substituem as regras de segurança do servidor.

## Tarefas, análises e relatórios

- **Tarefas** (`/tarefas`): listagem paginada com filtros por tipo/status, detalhe com atualização automática em intervalo progressivo de 2 a 4 segundos, cancelamento somente em `PENDENTE`, exclusão somente em estados terminais e download privado por Axios com `responseType: 'blob'`. HTTP 409 é apresentado como resultado ainda indisponível e HTTP 410 como resultado expirado. A tela identifica tentativas que retornaram a `PENDENTE` com erro e orienta verificar Redis e worker quando uma tarefa permanece pendente por mais de cinco minutos.
- **Análises** (`/analises`): execução de eficiência, rentabilidade e vida útil via endpoints próprios. Cada submissão gera uma nova `Idempotency-Key` UUID e recebe HTTP 202; o identificador inicial é o da tarefa, acompanhado em `/tarefas`. O histórico é consultado separadamente em `/analises`, permitindo manter os registros analíticos mesmo após expirar o payload temporário da tarefa. O período aceita filtros opcionais e valida o limite de 366 dias quando as duas datas são informadas. Valores nulos e amostras insuficientes são apresentados explicitamente; as limitações de vida útil são exibidas literalmente como recebidas. A análise de rentabilidade mantém estimativas e valores realizados como métricas independentes, sem apresentar cálculo de lucro ou retorno sobre investimento.
- **Relatórios** (`/relatorios`): geração síncrona por organização, status e financeiro, além de solicitação assíncrona pelo endpoint de tarefas (`GERACAO_RELATORIO`). O relatório financeiro é identificado como resumo de valores contratuais e a observação textual retornada pela API é exibida sem reescrita.

Testes dos contratos HTTP e validações desta fase estão em `features/tarefas/__tests__`, `features/analises/__tests__` e `features/relatorios/__tests__`.


## Dashboard por papel 

A página inicial apresenta painéis específicos para `ADMINISTRADOR`, `OPERADOR_CADASTRO`, `GESTOR_ALMOXARIFADO` e `AUDITOR`. Não existe endpoint agregado de dashboard: cada visualização consulta somente os endpoints dos módulos que o respectivo papel já pode acessar. O backend permanece como autoridade final de autorização.

- **Administrador:** organizações e contratos, lotes, equipamentos, tarefas e histórico analítico.
- **Operador:** organizações e situação dos contratos.
- **Gestor:** lotes e equipamentos por status.
- **Auditor:** tarefas, resultados analíticos, relatórios por status e registros recentes do journal.

Os gráficos utilizam Recharts. As distribuições calculadas no cliente são contagens dos registros retornados pelos endpoints; onde a API informa paginação, o painel identifica quando a distribuição se refere aos registros carregados. Os indicadores de análise apresentam os campos persistidos pela análise: eficiência (média, mínimo, máximo, amostra e status), rentabilidade (médias estimadas por grupo e quantidade de avaliações) e vida útil (previsões, status, R² e limitações textuais do backend). Valores ausentes permanecem como não disponíveis; não são convertidos em zero nos resultados analíticos.
