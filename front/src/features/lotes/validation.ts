import type { DadosEquipamentoLote } from './types';
export function validarEquipamentoLote(item: DadosEquipamentoLote): string | null {
  if (!item.marca.trim() || item.marca.trim().length > 100) return 'A marca é obrigatória e deve ter até 100 caracteres.';
  if (!item.modelo.trim() || item.modelo.trim().length > 100) return 'O modelo é obrigatório e deve ter até 100 caracteres.';
  if (!Number.isInteger(item.anoFabricacao) || item.anoFabricacao < 1950 || item.anoFabricacao > 2100) return 'O ano de fabricação deve estar entre 1950 e 2100.';
  if (!Number.isFinite(item.pesoQuilogramas) || item.pesoQuilogramas <= 0 || item.pesoQuilogramas > 99999.999) return 'O peso deve ser positivo e não ultrapassar 99.999,999 kg.';
  return null;
}
export function validarQuantidadeEquipamentos(quantidadeAtual: number, quantidadeNova: number): string | null {
  if (quantidadeNova < 1) return 'Adicione ao menos um equipamento.';
  if (quantidadeAtual + quantidadeNova > 500) return 'O limite permitido é de 500 equipamentos por lote/operação.';
  return null;
}
