import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../lib/api';
import { analisesApi } from '../api';
vi.mock('../../../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const mocked = vi.mocked(api) as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
describe('analisesApi', () => { beforeEach(() => vi.clearAllMocks());
 it('submete análise com chave UUID de idempotência', async () => { mocked.post.mockResolvedValueOnce({ data: { id: 'task-uuid', status: 'PENDENTE' } }); await analisesApi.executar('vida-util', { inicio: '2026-01-01', fim: '2026-02-01' }, 'uuid'); expect(mocked.post).toHaveBeenCalledWith('/analises/vida-util', { inicio: '2026-01-01', fim: '2026-02-01' }, { headers: { 'Idempotency-Key': 'uuid' } }); });
 it('usa histórico durável para consulta', async () => { mocked.get.mockResolvedValueOnce({ data: { resultados: [] } }); await analisesApi.listar({ pagina: 1, limite: 20 }); expect(mocked.get).toHaveBeenCalledWith('/analises', { params: { pagina: 1, limite: 20 } }); });
});
