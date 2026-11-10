import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fp from "fastify-plugin";

const TAGS: Record<string, string> = {
  auth: "Autenticação",
  auditoria: "Auditoria",
  organizacoes: "Organizações e contratos",
  lotes: "Lotes",
  equipamentos: "Equipamentos",
  relatorios: "Relatórios",
  analises: "Análises",
  configuracao: "Configuração",
  usuarios: "Usuários",
  saude: "Sistema",
  public: "API Pública v1",
  "chaves-api": "Chaves de API",
  tarefas: "Tarefas assíncronas",
};

// Resumo de cada rota, com os papéis que podem usá-la
const RESUMOS: Record<string, string> = {
  "POST /api/v1/auth/login": "Autentica e devolve o access token e o refresh token",
  "POST /api/v1/auth/refresh": "Troca o refresh token por um novo par de tokens",
  "POST /api/v1/auth/logout": "Revoga o refresh token (encerra a sessão)",
  "POST /api/v1/auth/alterar-senha": "Altera a própria senha (revoga as sessões)",
  "GET /api/v1/auth/me": "Dados do usuário autenticado",

  "GET /api/v1/auditoria/journal": "Consulta paginada e somente de leitura do journal (administrador, auditor)",

  "POST /api/v1/organizacoes": "Cadastra organização, com contrato opcional (administrador, operador)",
  "GET /api/v1/organizacoes": "Lista organizações paginadas com filtros de razão social, CNPJ e status (administrador, operador)",
  "GET /api/v1/organizacoes/:id": "Consulta uma organização (administrador, operador)",
  "PATCH /api/v1/organizacoes/:id": "Altera CNPJ/endereço ou desativa, com controle de versão (administrador, operador)",
  "POST /api/v1/organizacoes/:id/reativar": "Reativa organização com contrato vigente e controle de versão (administrador, operador)",
  "POST /api/v1/organizacoes/:id/contrato/encerrar": "Encerra contrato e desabilita renovação automática (administrador, operador)",
  "POST /api/v1/organizacoes/:id/contrato/encerrar-retroativo": "Corrige encerramento retroativo de contrato (somente administrador)",
  "POST /api/v1/organizacoes/:id/contrato": "Cria o contrato da organização (administrador, operador)",
  "POST /api/v1/organizacoes/:id/contrato/renovar": "Renova o contrato, com controle de versão (administrador, operador)",

  "POST /api/v1/lotes": "Registra lote, com equipamentos opcionais (administrador, gestor)",
  "GET /api/v1/lotes": "Lista lotes por período de entrada (administrador, gestor)",
  "GET /api/v1/lotes/:id": "Consulta um lote com seus equipamentos (administrador, gestor)",
  "DELETE /api/v1/lotes/:id": "Exclui lote vazio sem equipamentos vinculados (administrador, gestor)",
  "POST /api/v1/lotes/:id/equipamentos": "Adiciona equipamentos a um lote aberto (administrador, gestor)",
  "POST /api/v1/lotes/:id/triagem": "Conclui a triagem do lote, com controle de versão (administrador, gestor)",

  "GET /api/v1/equipamentos/:id/historico": "Rastreabilidade: equipamento e movimentações (administrador, gestor, auditor)",
  "DELETE /api/v1/equipamentos/:id": "Exclui equipamento sem histórico operacional (administrador, gestor)",
  "GET /api/v1/equipamentos/:id/depreciacao": "Calcula a depreciação acumulada (administrador, gestor)",
  "PATCH /api/v1/equipamentos/:id/estado-fisico": "Altera o estado físico, com controle de versão (administrador, gestor)",
  "PATCH /api/v1/equipamentos/:id/status": "Altera o status de rastreamento, com controle de versão (administrador, gestor)",
  "POST /api/v1/equipamentos/:id/movimentacoes": "Registra movimentação do equipamento (administrador, gestor)",
  "POST /api/v1/equipamentos/:id/triagem": "Registra a avaliação individual de triagem, com justificativa e controle de versão (administrador, gestor)",
  "POST /api/v1/equipamentos/:id/baixa-definitiva": "Registra a baixa definitiva autorizada, com justificativa, controle de versão e auditoria (somente administrador)",

  "POST /api/v1/analises/eficiencia": "Executa e persiste análise de eficiência operacional (administrador, auditor)",
  "POST /api/v1/analises/rentabilidade": "Executa e persiste análise de rentabilidade por equipamento (administrador, auditor)",
  "POST /api/v1/analises/vida-util": "Executa e persiste previsão exploratória de vida útil remanescente (administrador, auditor)",
  "GET /api/v1/analises": "Lista resultados analíticos com filtros e paginação (administrador, auditor)",
  "GET /api/v1/analises/:id": "Consulta um resultado analítico do histórico (administrador, auditor)",
  "PUT /api/v1/analises/:id": "Atualiza título e descrição sem alterar o snapshot estatístico (administrador, auditor)",
  "DELETE /api/v1/analises/:id": "Exclui permanentemente um resultado analítico (administrador, auditor)",

  "GET /api/v1/relatorios/organizacao/:id": "Relatório por organização e período (administrador, auditor)",
  "GET /api/v1/relatorios/status": "Relatório de equipamentos por status (administrador, auditor)",
  "GET /api/v1/relatorios/financeiro": "Relatório financeiro dos contratos no período (administrador, auditor)",

  "GET /api/v1/configuracao": "Consulta os parâmetros globais (administrador)",
  "PATCH /api/v1/configuracao": "Altera alíquota, coeficiente e valor-base (administrador)",

  "POST /api/v1/usuarios": "Cria uma conta de acesso (administrador)",
  "GET /api/v1/usuarios": "Lista as contas de acesso (administrador)",
  "DELETE /api/v1/usuarios/:id": "Exclui uma conta, revoga suas sessões e preserva o journal (administrador)",

  "GET /api/v1/saude": "Verifica o servidor e a conexão com o banco",

  "POST /api/v1/tarefas": "Cria e enfileira uma tarefa assíncrona",
  "GET /api/v1/tarefas": "Lista tarefas com filtros e paginação",
  "GET /api/v1/tarefas/:id": "Consulta estado, tentativas e resultado de uma tarefa",
  "PATCH /api/v1/tarefas/:id": "Atualiza parâmetros ou cancela uma tarefa pendente",
  "DELETE /api/v1/tarefas/:id": "Remove uma tarefa em estado terminal",
  "GET /api/v1/tarefas/:id/download": "Baixa o resultado JSON privado de uma tarefa concluída",
};

const ROTAS_PUBLICAS = new Set([
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/logout",
  "GET /api/v1/saude",
]);

export default fp(async (app) => {
  // Precisa ser registrado antes das rotas: o plugin lê cada rota ao ser criada
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Logística API",
        description:
          "API interna JWT e API pública versionada para parceiros. Rotas /api/v1/public exigem x-api-key; rotas administrativas usam JWT. Chaves são gerenciadas em /api/v1/chaves-api.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key", description: "Segredo emitido uma única vez na criação/rotação." },
        },
      },
    },
    transform: ({ schema, url, route }) => {
      // Algumas rotas internas/automáticas podem chegar sem schema completo.
      // Mantemos essas rotas fora do documento em vez de acessar propriedades ausentes.
      const esquema = schema && typeof schema === "object" ? schema : {};
      if (esquema.hide) return { schema: esquema, url };

      const metodo = String(
        Array.isArray(route?.method) ? route.method[0] : (route?.method ?? "GET"),
      ).toUpperCase();

      // O Fastify cria uma rota HEAD para cada GET.
      if (metodo === "HEAD") {
        return { schema: { ...esquema, hide: true }, url };
      }

      const rotaUrl = typeof route?.url === "string"
        ? route.url
        : (typeof url === "string" ? url : "/");
      const caminho = rotaUrl.length > 1 && rotaUrl.endsWith("/")
        ? rotaUrl.slice(0, -1)
        : rotaUrl;
      const chave = `${metodo} ${caminho}`;
      const segmento = caminho.split("/")[3] ?? "saude";
      const urlNormalizada = typeof url === "string" && url.length > 1 && url.endsWith("/")
        ? url.slice(0, -1)
        : url;

      return {
        schema: {
          ...esquema,
          summary: RESUMOS[chave] ?? esquema.summary,
          tags: TAGS[segmento] ? [TAGS[segmento]] : (esquema.tags ?? [segmento]),
          security: ROTAS_PUBLICAS.has(chave)
            ? []
            : (caminho.startsWith("/api/v1/public/")
              ? [{ apiKeyAuth: [] }]
              : [{ bearerAuth: [] }]),
        },
        url: urlNormalizada,
      };
    },
  });

  // Documento OpenAPI em uma URL estável e explícita. O Swagger UI usa
  // essa URL em vez de depender do endpoint implícito /docs/json.
  app.get(
    "/openapi.json",
    { schema: { hide: true } },
    async () => app.swagger(),
  );

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      url: "/openapi.json",
      docExpansion: "list",
      deepLinking: true,
    },
  });
});
