import { describe, expect, it } from 'vitest';
import { resumirLotes, resumirOrganizacoes, resumirTarefas, numeroFinito } from '../dashboard-metrics';
import type { TarefaResumo } from '../../tarefas/types';
import type { LoteResumo } from '../../lotes/types';
import type { Organizacao } from '../../organizacoes/types';

describe('dashboard metrics', () => {
  it('counts task states only from supplied records', () => {
    const tasks = [
      { status: 'PENDENTE' }, { status: 'PENDENTE' }, { status: 'FALHOU' },
    ] as unknown as TarefaResumo[];
    expect(resumirTarefas(tasks).filter((x) => x.quantidade > 0)).toEqual([
      { name: 'PENDENTE', quantidade: 2 }, { name: 'FALHOU', quantidade: 1 },
    ]);
  });

  it('groups lot states using backend status fields', () => {
    const lots = [{ statusProcessamento: 'RECEBIDO' }, { statusProcessamento: 'FINALIZADO' }] as unknown as LoteResumo[];
    expect(resumirLotes(lots).filter((x) => x.quantidade > 0)).toEqual([
      { name: 'RECEBIDO', quantidade: 1 }, { name: 'FINALIZADO', quantidade: 1 },
    ]);
  });

  it('summarizes contracts without assuming a contract exists', () => {
    const orgs = [
      { contrato: { vigente: true } }, { contrato: { vigente: false } }, { contrato: null },
    ] as unknown as Organizacao[];
    expect(resumirOrganizacoes(orgs)).toEqual([
      { name: 'Vigentes', quantidade: 1 },
      { name: 'Encerrados/não vigentes', quantidade: 1 },
      { name: 'Sem contrato', quantidade: 1 },
    ]);
  });

  it('does not coerce null, strings or invalid values into numeric metrics', () => {
    expect(numeroFinito(null)).toBeNull();
    expect(numeroFinito('12')).toBeNull();
    expect(numeroFinito(Number.NaN)).toBeNull();
    expect(numeroFinito(12)).toBe(12);
  });
});
