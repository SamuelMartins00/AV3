export function validarPeriodoAnalise(inicio?: string, fim?: string): string | null {
  if (!inicio || !fim) return null;
  const de = new Date(`${inicio}T00:00:00.000Z`).getTime();
  const ate = new Date(`${fim}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(de) || !Number.isFinite(ate)) return 'Informe datas válidas.';
  if (de > ate) return 'A data inicial deve ser anterior ou igual à final.';
  if (ate - de > 366 * 24 * 60 * 60 * 1000) return 'O período máximo permitido é de 366 dias.';
  return null;
}
export function exibirValorAnalise(valor: unknown): string {
  if (valor === null || valor === undefined || (typeof valor === 'number' && !Number.isFinite(valor))) return 'Não disponível';
  if (typeof valor === 'number') return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  return String(valor);
}
