export function validarDuracaoRenovacaoAutomatica(ativa: boolean, duracao?: number): string | null {
  if (!ativa) return null;
  if (!Number.isInteger(duracao) || duracao === undefined || duracao < 1 || duracao > 1200) {
    return 'Informe uma duração explícita entre 1 e 1200 meses para a renovação automática.';
  }
  return null;
}
export function validarMotivoEncerramento(motivo: string): string | null {
  return motivo.trim().length === 0 ? 'Informe o motivo do encerramento.' : null;
}

export function validarClausulasContrato(clausulas: string[]): string | null {
  if (clausulas.length > 50) return 'O contrato aceita no máximo 50 cláusulas.';
  if (clausulas.some((clausula) => clausula.trim().length === 0 || clausula.length > 1000)) return 'Cada cláusula deve ter entre 1 e 1000 caracteres.';
  return null;
}
