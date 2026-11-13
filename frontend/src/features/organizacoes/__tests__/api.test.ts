import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { api } from '../../../lib/api';
import { organizacoesApi } from '../api';
vi.mock('../../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const mocked = api as unknown as {
  get: Mock;
  post: Mock;
  patch: Mock;
};
describe('organizacoesApi', () => {
  beforeEach(() => vi.clearAllMocks());
  it('consulta as opções mínimas para seletores', async () => {
    mocked.get.mockResolvedValueOnce({ data: [{ id: 4, razaoSocial: 'Acme', ativo: true }] } as never);
    await expect(organizacoesApi.opcoes()).resolves.toEqual([{ id: 4, razaoSocial: 'Acme', ativo: true }]);
    expect(mocked.get).toHaveBeenCalledWith('/organizacoes/opcoes', { params: {} });
  });
  it('envia filtros de listagem e paginação', async () => {
    const filters = { page: 2, limit: 10, razaoSocial: 'Acme', ativo: false };
    mocked.get.mockResolvedValueOnce({ data: { items: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } } } as never);
    await organizacoesApi.listar(filters);
    expect(mocked.get).toHaveBeenCalledWith('/organizacoes', { params: filters });
  });
  it('envia versão na edição e na reativação', async () => {
    mocked.patch.mockResolvedValueOnce({ data: {} } as never); mocked.post.mockResolvedValueOnce({ data: {} } as never);
    await organizacoesApi.atualizar(7, { versao: 3, enderecoCompleto: 'Rua A' });
    await organizacoesApi.reativar(7, 4);
    expect(mocked.patch).toHaveBeenCalledWith('/organizacoes/7', { versao: 3, enderecoCompleto: 'Rua A' });
    expect(mocked.post).toHaveBeenCalledWith('/organizacoes/7/reativar', { versao: 4 });
  });
  it('cadastra contrato sem versão e exige versão nas operações subsequentes', async () => {
    mocked.post.mockResolvedValue({ data: {} } as never);
    await organizacoesApi.criarContrato(7, { dataVencimento: '2027-12-31', valorMensal: 900 });
    await organizacoesApi.renovar(7, '2028-12-31', 5);
    await organizacoesApi.encerrar(7, 'Fim de prestação', 6);
    await organizacoesApi.encerrarRetroativo(7, 'Correção', '2026-09-01', 7);
    expect(mocked.post).toHaveBeenNthCalledWith(1, '/organizacoes/7/contrato', { dataVencimento: '2027-12-31', valorMensal: 900 });
    expect(mocked.post).toHaveBeenNthCalledWith(2, '/organizacoes/7/contrato/renovar', { novoVencimento: '2028-12-31', versao: 5 });
    expect(mocked.post).toHaveBeenNthCalledWith(3, '/organizacoes/7/contrato/encerrar', { motivo: 'Fim de prestação', versao: 6 });
    expect(mocked.post).toHaveBeenNthCalledWith(4, '/organizacoes/7/contrato/encerrar-retroativo', { motivo: 'Correção', dataEncerramento: '2026-09-01', versao: 7 });
  });
});
