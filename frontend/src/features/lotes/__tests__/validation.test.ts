import { describe, expect, it } from 'vitest';
import { validarEquipamentoLote, validarQuantidadeEquipamentos } from '../validation';
const valid={tipo:'NOTEBOOK' as const,marca:'Dell',modelo:'Latitude',anoFabricacao:2020,estadoFisico:'BOM_ESTADO' as const,pesoQuilogramas:2};
describe('validações de lote',()=>{
 it('aceita equipamento válido',()=>expect(validarEquipamentoLote(valid)).toBeNull());
 it('exige marca e modelo',()=>expect(validarEquipamentoLote({...valid,marca:'  '})).toContain('marca'));
 it('limita o ano de fabricação',()=>expect(validarEquipamentoLote({...valid,anoFabricacao:1949})).toContain('ano'));
 it('exige peso positivo',()=>expect(validarEquipamentoLote({...valid,pesoQuilogramas:0})).toContain('peso'));
 it('não permite exceder 500 equipamentos',()=>expect(validarQuantidadeEquipamentos(498,3)).toContain('500'));
});
