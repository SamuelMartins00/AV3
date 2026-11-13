import type { Equipamento, Movimentacao, AvaliacaoRecuperacao, } from "../../generated/prisma/client.js";

export function equipamentoParaResposta(eq: Equipamento) {
  return {
    id: eq.id,
    codigoBarrasInterno: eq.codigoBarrasInterno,
    loteId: eq.loteId,
    posicaoNoLote: eq.posicaoNoLote,
    tipo: eq.tipo,
    marca: eq.marca,
    modelo: eq.modelo,
    anoFabricacao: eq.anoFabricacao,
    estadoFisico: eq.estadoFisico,
    statusRastreamento: eq.statusRastreamento,
    resultadoTriagem: eq.resultadoTriagem,
    triagemResponsavel: eq.triagemResponsavel,
    triagemEm: eq.triagemEm,
    triagemJustificativa: eq.triagemJustificativa,
    baixadoEm: eq.baixadoEm,
    baixaResponsavel: eq.baixaResponsavel,
    baixaJustificativa: eq.baixaJustificativa,
    pesoQuilogramas: eq.pesoQuilogramas.toNumber(),
    versao: eq.versao,
  };
}

export function movimentacaoParaResposta(mov: Movimentacao) {
  return {
    id: mov.id,
    equipamentoId: mov.equipamentoId,
    dataHora: mov.dataHora,
    origem: mov.origem,
    destino: mov.destino,
    responsavel: mov.responsavel,
    observacao: mov.observacao,
  };
}

export function avaliacaoRecuperacaoParaResposta(
  avaliacao: AvaliacaoRecuperacao,
) {
  return {
    id: avaliacao.id,
    equipamentoId: avaliacao.equipamentoId,
    material: avaliacao.material,
    estadoFisicoSnapshot: avaliacao.estadoFisicoSnapshot,
    valorEstimado: avaliacao.valorEstimado.toNumber(),
    valorRealizado: avaliacao.valorRealizado?.toNumber() ?? null,
    avaliadoEm: avaliacao.avaliadoEm,
    realizadoEm: avaliacao.realizadoEm,
    responsavel: avaliacao.responsavel,
    observacao: avaliacao.observacao,
  };
}