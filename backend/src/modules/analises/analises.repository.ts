import { prisma } from "../../config/prisma.js";
import type { ConsultarAnalisesQuery, TipoAnalise } from "./analises.schemas.js";

export const analisesRepository = {
  eficiencia(organizacaoId: number | undefined, inicio: Date | undefined, fim: Date | undefined, take: number) {
    return prisma.lote.findMany({
      where: { organizacaoId, dataEntrada: { gte: inicio, lte: fim }, triagemConcluidaEm: { not: null } },
      select: { id: true, dataEntrada: true, triagemConcluidaEm: true, organizacaoId: true },
      orderBy: { triagemConcluidaEm: "asc" }, take,
    });
  },
  rentabilidade(organizacaoId: number | undefined, inicio: Date | undefined, fim: Date | undefined, take: number) {
    return prisma.avaliacaoRecuperacao.findMany({
      where: { equipamento: { lote: { organizacaoId, dataEntrada: { gte: inicio, lte: fim } } }, avaliadoEm: { gte: inicio, lte: fim } },
      select: { id: true, material: true, estadoFisicoSnapshot: true, valorEstimado: true, valorRealizado: true, avaliadoEm: true, realizadoEm: true,
        equipamento: { select: { tipo: true, marca: true, modelo: true, estadoFisico: true } } },
      orderBy: { avaliadoEm: "asc" }, take,
    });
  },
  vidaUtil(organizacaoId: number | undefined, inicio: Date | undefined, fim: Date | undefined, take: number) {
    return prisma.historicoDepreciacao.findMany({
      where: { equipamento: { lote: { organizacaoId, dataEntrada: { gte: inicio, lte: fim } } }, dataReferencia: { gte: inicio, lte: fim } },
      select: { id: true, equipamentoId: true, dataReferencia: true, valorAtual: true, valorBase: true, percentualDepreciacao: true, metodo: true,
        equipamento: { select: { tipo: true, marca: true, modelo: true, anoFabricacao: true } } },
      orderBy: [{ equipamentoId: "asc" }, { dataReferencia: "asc" }], take,
    });
  },
  falhas(organizacaoId: number | undefined, inicio: Date | undefined, fim: Date | undefined, take: number) {
    return prisma.historicoFalha.findMany({
      where: { equipamento: { lote: { organizacaoId, dataEntrada: { gte: inicio, lte: fim } } }, ocorridoEm: { gte: inicio, lte: fim } },
      select: { id: true, equipamentoId: true, ocorridoEm: true, custoReparo: true, resolvido: true },
      orderBy: { ocorridoEm: "asc" }, take,
    });
  },
  salvar(dados: { organizacaoId?: number; tipo: TipoAnalise; titulo: string; descricao: string; dados: object; parametros: object; periodoInicio?: Date; periodoFim?: Date; versaoModelo: string }) {
    return prisma.resultadoAnalitico.create({ data: {
      organizacaoId: dados.organizacaoId, tipo: dados.tipo, titulo: dados.titulo,
      descricao: dados.descricao, dados: dados.dados, parametros: dados.parametros,
      periodoInicio: dados.periodoInicio, periodoFim: dados.periodoFim, versaoModelo: dados.versaoModelo,
    } });
  },
  listar(filtros: ConsultarAnalisesQuery) {
    const inicio = filtros.inicio ? new Date(filtros.inicio) : undefined;
    const fim = filtros.fim ? new Date(filtros.fim) : undefined;
    return prisma.resultadoAnalitico.findMany({
      where: { tipo: filtros.tipo, organizacaoId: filtros.organizacaoId,
        geradoEm: { gte: inicio, lte: fim } },
      orderBy: [{ geradoEm: "desc" }, { id: "desc" }],
      skip: ((filtros.pagina ?? 1) - 1) * (filtros.limite ?? 20), take: filtros.limite ?? 20,
    });
  },
  contar(filtros: ConsultarAnalisesQuery) {
    const inicio = filtros.inicio ? new Date(filtros.inicio) : undefined;
    const fim = filtros.fim ? new Date(filtros.fim) : undefined;
    return prisma.resultadoAnalitico.count({ where: { tipo: filtros.tipo, organizacaoId: filtros.organizacaoId, geradoEm: { gte: inicio, lte: fim } } });
  },
  buscarPorId(id: number) { return prisma.resultadoAnalitico.findUnique({ where: { id } }); },
  async atualizarMetadados(id: number, dados: { titulo: string; descricao: string | null }) {
    const atualizacao = await prisma.resultadoAnalitico.updateMany({
      where: { id },
      data: { titulo: dados.titulo, descricao: dados.descricao },
    });
    if (atualizacao.count === 0) return null;
    return prisma.resultadoAnalitico.findUnique({ where: { id } });
  },
  async excluir(id: number) {
    const resultado = await prisma.resultadoAnalitico.deleteMany({ where: { id } });
    return resultado.count > 0;
  },
};
