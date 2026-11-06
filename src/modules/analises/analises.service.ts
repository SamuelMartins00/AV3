import { ErroDominio } from "../../dominio/erros.js";
import { analisesRepository as repo } from "./analises.repository.js";
import { mapearResultadoAnalitico } from "./analises.mapper.js";
import type { ExecutarAnaliseBody, ConsultarAnalisesQuery, TipoAnalise, AtualizarAnaliseBody } from "./analises.schemas.js";

const VERSAO_MODELO = "1.0.0";
const MAX_AMOSTRA = 10000;
function dataValida(valor: string | undefined, campo: string): Date | undefined {
  if (valor === undefined) return undefined;
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) throw new ErroDominio(`${campo} inválida.`, 400);
  return data;
}
function validarPeriodo(inicio?: string, fim?: string) {
  const de = dataValida(inicio, "Data inicial");
  const ate = dataValida(fim, "Data final");
  if (de && ate && de > ate) throw new ErroDominio("A data inicial deve ser anterior ou igual à data final.", 400);
  if (de && ate && ate.getTime() - de.getTime() > 366 * 24 * 60 * 60 * 1000) throw new ErroDominio("O período máximo permitido é de 366 dias.", 400);
  return { inicio: de, fim: ate };
}
export function calcularRegressaoLinear(pontos: Array<{ x: number; y: number }>) {
  if (pontos.length < 3) return { suficiente: false as const, motivo: "AMOSTRA_INSUFICIENTE", quantidade: pontos.length };
  const mediaX = pontos.reduce((s, p) => s + p.x, 0) / pontos.length;
  const mediaY = pontos.reduce((s, p) => s + p.y, 0) / pontos.length;
  const variacaoX = pontos.reduce((s, p) => s + (p.x - mediaX) ** 2, 0);
  if (variacaoX === 0) return { suficiente: false as const, motivo: "DATAS_SEM_VARIACAO", quantidade: pontos.length };
  const inclinacao = pontos.reduce((s, p) => s + (p.x - mediaX) * (p.y - mediaY), 0) / variacaoX;
  const intercepto = mediaY - inclinacao * mediaX;
  const sst = pontos.reduce((s, p) => s + (p.y - mediaY) ** 2, 0);
  const sse = pontos.reduce((s, p) => s + (p.y - (intercepto + inclinacao * p.x)) ** 2, 0);
  return { suficiente: true as const, inclinacao, intercepto, r2: sst === 0 ? null : 1 - sse / sst, quantidade: pontos.length };
}
function media(valores: number[]) { return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null; }
function periodoDescricao(inicio?: Date, fim?: Date) { return { inicio: inicio?.toISOString() ?? null, fim: fim?.toISOString() ?? null }; }

export class AnalisesService {
  private async executar(tipo: TipoAnalise, consulta: ExecutarAnaliseBody) {
    const periodo = validarPeriodo(consulta.inicio, consulta.fim);
    const limite = consulta.limiteAmostra ?? MAX_AMOSTRA;
    if (!Number.isInteger(limite) || limite < 3 || limite > MAX_AMOSTRA) throw new ErroDominio("limiteAmostra deve estar entre 3 e 10000.", 400);
    let dados: Record<string, unknown>;
    let descricao: string;
    if (tipo === "EFICIENCIA_OPERACIONAL") {
      const lotes = await repo.eficiencia(consulta.organizacaoId, periodo.inicio, periodo.fim, limite);
      const duracoes = lotes.flatMap((l) => {
        const fim = l.triagemConcluidaEm;
        if (!fim || fim < l.dataEntrada) return [];
        return [(fim.getTime() - l.dataEntrada.getTime()) / 3_600_000];
      });
      dados = { unidade: "horas", amostra: duracoes.length, registrosIgnorados: lotes.length - duracoes.length,
        mediaHoras: media(duracoes), minimoHoras: duracoes.length ? Math.min(...duracoes) : null,
        maximoHoras: duracoes.length ? Math.max(...duracoes) : null,
        statusAmostra: duracoes.length < 3 ? "INSUFICIENTE" : "SUFICIENTE",
        observacao: "Uma observação por lote; duração entre dataEntrada e triagemConcluidaEm. Não há atribuição confiável por operador nos campos agregados do lote." };
      descricao = "Tempo decorrido entre recebimento e conclusão da triagem, em horas.";
    } else if (tipo === "RENTABILIDADE_EQUIPAMENTOS") {
      const avaliacoes = await repo.rentabilidade(consulta.organizacaoId, periodo.inicio, periodo.fim, limite);
      const grupos = new Map<string, { tipo: string; estadoFisicoSnapshot: string | null; marca: string; modelo: string; estimados: number[]; realizados: number[] }>();
      for (const a of avaliacoes) {
        const estado = a.estadoFisicoSnapshot ?? "NAO_INFORMADO";
        const chave = JSON.stringify([a.equipamento.tipo, estado, a.equipamento.marca, a.equipamento.modelo]);
        const g = grupos.get(chave) ?? { tipo: a.equipamento.tipo, estadoFisicoSnapshot: a.estadoFisicoSnapshot, marca: a.equipamento.marca, modelo: a.equipamento.modelo, estimados: [], realizados: [] };
        const estimado = a.valorEstimado.toNumber();
        if (Number.isFinite(estimado) && estimado >= 0) g.estimados.push(estimado);
        if (a.valorRealizado !== null) { const realizado = a.valorRealizado.toNumber(); if (Number.isFinite(realizado) && realizado >= 0) g.realizados.push(realizado); }
        grupos.set(chave, g);
      }
      dados = { amostraAvaliacoes: avaliacoes.length, grupos: [...grupos.values()].map((g) => ({
        tipo: g.tipo, estadoFisicoSnapshot: g.estadoFisicoSnapshot, marca: g.marca, modelo: g.modelo,
        mediaValorEstimado: media(g.estimados), quantidadeEstimativas: g.estimados.length,
        mediaValorRealizado: media(g.realizados), quantidadeValoresRealizados: g.realizados.length,
      })), observacao: "Valor estimado e valor realizado são métricas independentes. Estimativas não representam receita; somente valorRealizado preenchido é agregado como realizado." };
      descricao = "Médias de valores estimados e realizados por tipo, estado físico snapshot, marca e modelo.";
    } else {
      const [historicos, falhas] = await Promise.all([
        repo.vidaUtil(consulta.organizacaoId, periodo.inicio, periodo.fim, limite),
        repo.falhas(consulta.organizacaoId, periodo.inicio, periodo.fim, limite),
      ]);
      const falhasPorEquipamento = new Map<number, typeof falhas>();
      for (const falha of falhas) falhasPorEquipamento.set(falha.equipamentoId, [...(falhasPorEquipamento.get(falha.equipamentoId) ?? []), falha]);
      const porEquipamento = new Map<number, typeof historicos>();
      for (const h of historicos) porEquipamento.set(h.equipamentoId, [...(porEquipamento.get(h.equipamentoId) ?? []), h]);
      const previsoes = [...porEquipamento.entries()].map(([equipamentoId, registros]) => {
        const base = registros[0]!.dataReferencia.getTime();
        const pontos = registros.map((r) => ({ x: (r.dataReferencia.getTime() - base) / 86_400_000, y: r.valorAtual.toNumber() }));
        const regressao = calcularRegressaoLinear(pontos);
        const ultimo = registros[registros.length - 1]!;
        const dias = regressao.suficiente && regressao.inclinacao < 0 && ultimo.valorAtual.toNumber() > 0
          ? ultimo.valorAtual.toNumber() / -regressao.inclinacao : null;
        return { equipamentoId, tipo: ultimo.equipamento.tipo, marca: ultimo.equipamento.marca, modelo: ultimo.equipamento.modelo,
          observacoes: pontos.length, quantidadeFalhasNoPeriodo: falhasPorEquipamento.get(equipamentoId)?.length ?? 0, custoFalhasNoPeriodo: (falhasPorEquipamento.get(equipamentoId) ?? []).reduce((s, f) => s + (f.custoReparo?.toNumber() ?? 0), 0), valorAtualReferencia: ultimo.valorAtual.toNumber(), taxaVariacaoValorPorDia: regressao.suficiente ? regressao.inclinacao : null,
          r2: regressao.suficiente ? regressao.r2 : null, vidaRemanescenteDias: dias,
          status: !regressao.suficiente ? regressao.motivo : regressao.inclinacao >= 0 ? "SEM_DEPRECIACAO_LINEAR" : "PREVISAO_LINEAR" };
      });
      dados = { metodo: "REGRESSAO_LINEAR_SIMPLES", unidadeTempo: "dias", amostraRegistros: historicos.length, amostraFalhas: falhas.length,
        equipamentosAnalisados: previsoes.length, previsoes, limitacoes: [
          "A regressão usa valorAtual observado ao longo do tempo e extrapola a tendência linear até valor zero.",
          "São exigidas ao menos três observações por equipamento em datas distintas.",
          "Tendências não decrescentes ou valores atuais não positivos não geram previsão.",
          "Falhas e custos de reparo são apresentados como contexto descritivo, não como preditores da regressão.",
          "A estimativa não incorpora vida útil técnica, obsolescência ou intensidade de uso; não é garantia de vida física restante.",
          "Resultados são sensíveis à janela histórica e a registros atípicos; R² é informativo e não valida causalidade." ] };
      descricao = "Estimativa exploratória de dias até valor depreciado zero por regressão linear simples do valor atual.";
    }
    const registro = await repo.salvar({ organizacaoId: consulta.organizacaoId, tipo, titulo: `Análise: ${tipo}`, descricao, dados,
      parametros: { ...consulta, periodo: periodoDescricao(periodo.inicio, periodo.fim), limiteAmostra: limite },
      periodoInicio: periodo.inicio, periodoFim: periodo.fim, versaoModelo: VERSAO_MODELO });
    return mapearResultadoAnalitico(registro);
  }
  eficiencia(consulta: ExecutarAnaliseBody) { return this.executar("EFICIENCIA_OPERACIONAL", consulta); }
  rentabilidade(consulta: ExecutarAnaliseBody) { return this.executar("RENTABILIDADE_EQUIPAMENTOS", consulta); }
  vidaUtil(consulta: ExecutarAnaliseBody) { return this.executar("VIDA_UTIL_REMANESCENTE", consulta); }
  async listar(filtros: ConsultarAnalisesQuery) {
    const periodo = validarPeriodo(filtros.inicio, filtros.fim);
    if (periodo.inicio && periodo.fim && periodo.fim.getTime() - periodo.inicio.getTime() > 366 * 24 * 60 * 60 * 1000) throw new ErroDominio("O período máximo permitido é de 366 dias.", 400);
    const [registros, total] = await Promise.all([repo.listar(filtros), repo.contar(filtros)]);
    return { pagina: filtros.pagina ?? 1, limite: filtros.limite ?? 20, total, resultados: registros.map(mapearResultadoAnalitico) };
  }
  async buscar(id: number) {
    const registro = await repo.buscarPorId(id);
    if (!registro) throw new ErroDominio(`Resultado analítico ${id} não encontrado.`, 404);
    return mapearResultadoAnalitico(registro);
  }

  async atualizar(id: number, entrada: AtualizarAnaliseBody) {
    const titulo = entrada.titulo.trim();
    if (titulo.length < 3 || titulo.length > 160) {
      throw new ErroDominio("O título deve possuir entre 3 e 160 caracteres.", 400);
    }
    const descricao = entrada.descricao?.trim() || null;
    if (descricao && descricao.length > 2000) {
      throw new ErroDominio("A descrição deve possuir no máximo 2000 caracteres.", 400);
    }
    const registro = await repo.atualizarMetadados(id, { titulo, descricao });
    if (!registro) throw new ErroDominio(`Resultado analítico ${id} não encontrado.`, 404);
    return mapearResultadoAnalitico(registro);
  }

  async excluir(id: number) {
    const excluido = await repo.excluir(id);
    if (!excluido) throw new ErroDominio(`Resultado analítico ${id} não encontrado.`, 404);
  }
}
