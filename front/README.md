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

As páginas dos módulos ainda são placeholders intencionais; as funcionalidades serão implementadas nas fases correspondentes. Não há dashboard nesta fase.

### Componentes compartilhados

- `components/ui/form-field.tsx`: campo de formulário com estados de erro e dica.
- `components/ui/data-table.tsx`: tabela genérica tipada e estado vazio.
- `components/ui/modal.tsx`: modal acessível com fechamento por Escape e clique externo.
- `components/ui/confirm-dialog.tsx`: confirmação de ações.
- `app/toast-provider.tsx`: notificações de sucesso, erro e informação.

A rota `/403` apresenta a página de acesso negado. Rotas de módulos não permitidos também exibem essa página. Rotas inexistentes exibem a página 404 dentro da área autenticada.
