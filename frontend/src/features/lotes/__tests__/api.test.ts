import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { api } from '../../../lib/api';
import { lotesApi } from '../api';
vi.mock('../../../lib/api',()=>({api:{get:vi.fn(),post:vi.fn(),delete:vi.fn()}}));
const mocked=api as unknown as {get:Mock;post:Mock;delete:Mock};
beforeEach(()=>vi.clearAllMocks());
describe('lotesApi',()=>{
 it('lista com filtros na rota oficial',async()=>{mocked.get.mockResolvedValueOnce({data:[]});await lotesApi.listar({organizacaoId:8,statusProcessamento:'RECEBIDO'});expect(mocked.get).toHaveBeenCalledWith('/api/v1/lotes',{params:{organizacaoId:8,statusProcessamento:'RECEBIDO'}})});
 it('cria lote enviando somente os dados recebidos',async()=>{mocked.post.mockResolvedValueOnce({data:{id:3}});const body={dataEntrada:'2026-11-10',organizacaoId:2,notaFiscal:'NF-2',transportadora:'Transportes'};await lotesApi.criar(body);expect(mocked.post).toHaveBeenCalledWith('/api/v1/lotes',body)});
 it('conclui triagem com a versão atual',async()=>{mocked.post.mockResolvedValueOnce({data:{}});await lotesApi.concluirTriagem(3,7);expect(mocked.post).toHaveBeenCalledWith('/api/v1/lotes/3/triagem',{versao:7})});
 it('inclui equipamentos no endpoint do lote',async()=>{mocked.post.mockResolvedValueOnce({data:{}});const equipamentos=[{tipo:'NOTEBOOK' as const,marca:'A',modelo:'B',anoFabricacao:2020,estadoFisico:'BOM_ESTADO' as const,pesoQuilogramas:2}];await lotesApi.adicionarEquipamentos(3,equipamentos);expect(mocked.post).toHaveBeenCalledWith('/api/v1/lotes/3/equipamentos',{equipamentos})});
 it('exclui pelo endpoint específico',async()=>{mocked.delete.mockResolvedValueOnce({});await lotesApi.excluir(3);expect(mocked.delete).toHaveBeenCalledWith('/api/v1/lotes/3')});
});
