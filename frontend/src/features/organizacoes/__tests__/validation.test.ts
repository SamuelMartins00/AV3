import { describe, expect, it } from 'vitest';
import { validarClausulasContrato, validarDuracaoRenovacaoAutomatica, validarMotivoEncerramento } from '../validation';
describe('validações de contrato', () => {
  it('não exige duração quando renovação automática está desativada', () => expect(validarDuracaoRenovacaoAutomatica(false)).toBeNull());
  it('exige duração explícita para renovação automática', () => {
    expect(validarDuracaoRenovacaoAutomatica(true)).toContain('duração explícita');
    expect(validarDuracaoRenovacaoAutomatica(true, 0)).not.toBeNull();
    expect(validarDuracaoRenovacaoAutomatica(true, 1201)).not.toBeNull();
    expect(validarDuracaoRenovacaoAutomatica(true, 12)).toBeNull();
  });
  it('não permite motivo vazio ou composto apenas por espaços', () => {
    expect(validarMotivoEncerramento('  ')).not.toBeNull();
    expect(validarMotivoEncerramento('Rescisão contratual')).toBeNull();
  });
});

describe('validação de cláusulas', () => {
  it('limita o contrato a 50 cláusulas de até 1000 caracteres', () => {
    expect(validarClausulasContrato(['Cláusula válida'])).toBeNull();
    expect(validarClausulasContrato(Array.from({ length: 51 }, () => 'x'))).not.toBeNull();
    expect(validarClausulasContrato(['x'.repeat(1001)])).not.toBeNull();
  });
});
