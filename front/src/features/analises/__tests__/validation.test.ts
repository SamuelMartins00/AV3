import { describe, expect, it } from 'vitest';
import { exibirValorAnalise, validarPeriodoAnalise } from '../validation';
describe('validação e apresentação das análises',()=>{
 it('permite períodos ausentes quando o backend admite filtro parcial',()=>expect(validarPeriodoAnalise('2026-01-01',undefined)).toBeNull());
 it('rejeita intervalo superior a 366 dias',()=>expect(validarPeriodoAnalise('2025-01-01','2026-01-03')).toContain('366'));
 it('rejeita início posterior ao fim',()=>expect(validarPeriodoAnalise('2026-02-02','2026-02-01')).toContain('anterior'));
 it('apresenta valores nulos como indisponíveis',()=>expect(exibirValorAnalise(null)).toBe('Não disponível'));
});
