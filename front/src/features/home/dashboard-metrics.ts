import type { StatusTarefa, TarefaResumo } from '../tarefas/types';
import type { TipoAnalise, ResultadoAnalise } from '../analises/types';
import type { LoteResumo } from '../lotes/types';
import type { Equipamento } from '../equipamentos/types';
import type { Organizacao } from '../organizacoes/types';

export const tarefaStatusOrder: StatusTarefa[] = ['PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'FALHOU', 'CANCELADA'];

export function contarPor<T extends string>(items: readonly T[], values: readonly T[]) {
  return values.map((value) => ({ name: value.replaceAll('_', ' '), value: items.filter((item) => item === value).length }));
}

export function resumirTarefas(tarefas: readonly TarefaResumo[]) {
  return tarefaStatusOrder.map((status) => ({
    name: status.replaceAll('_', ' '),
    quantidade: tarefas.filter((tarefa) => tarefa.status === status).length,
  }));
}

export function resumirLotes(lotes: readonly LoteResumo[]) {
  const statuses = ['RECEBIDO', 'EM_TRIAGEM', 'TRIAGEM_CONCLUIDA', 'ENCAMINHADO', 'FINALIZADO'] as const;
  return statuses.map((status) => ({
    name: status.replaceAll('_', ' '),
    quantidade: lotes.filter((lote) => lote.statusProcessamento === status).length,
  }));
}

export function resumirEquipamentos(equipamentos: readonly Equipamento[]) {
  const statuses = [...new Set(equipamentos.map((item) => item.statusRastreamento))].sort();
  return statuses.map((status) => ({
    name: status.replaceAll('_', ' '),
    quantidade: equipamentos.filter((item) => item.statusRastreamento === status).length,
  }));
}

export function resumirOrganizacoes(organizacoes: readonly Organizacao[]) {
  const contratos = organizacoes.flatMap((organizacao) => organizacao.contrato ? [organizacao.contrato] : []);
  return [
    { name: 'Vigentes', quantidade: contratos.filter((contrato) => contrato.vigente).length },
    { name: 'Encerrados/não vigentes', quantidade: contratos.filter((contrato) => !contrato.vigente).length },
    { name: 'Sem contrato', quantidade: organizacoes.filter((organizacao) => !organizacao.contrato).length },
  ];
}

export function resumirTiposAnalise(analises: readonly ResultadoAnalise[]) {
  const tipos: TipoAnalise[] = ['EFICIENCIA_OPERACIONAL', 'RENTABILIDADE_EQUIPAMENTOS', 'VIDA_UTIL_REMANESCENTE'];
  return tipos.map((tipo) => ({
    name: tipo.replaceAll('_', ' '),
    quantidade: analises.filter((analise) => analise.tipo === tipo).length,
  }));
}

export function numeroFinito(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
