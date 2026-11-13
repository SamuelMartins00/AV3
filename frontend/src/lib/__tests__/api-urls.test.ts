import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { analisesApi } from '../../features/analises/api';
import { auditoriaApi } from '../../features/auditoria/api';
import { authApi } from '../../features/auth/api';
import { chavesApi } from '../../features/chaves-api/api';
import { configuracaoApi } from '../../features/configuracao/api';
import { equipamentosApi } from '../../features/equipamentos/api';
import { lotesApi } from '../../features/lotes/api';
import { organizacoesApi } from '../../features/organizacoes/api';
import { relatoriosApi } from '../../features/relatorios/api';
import { tarefasApi } from '../../features/tarefas/api';
import { usuariosApi } from '../../features/usuarios/api';
import { api } from '../api';

// Os testes de cada módulo fazem mock de `api` e só veem o caminho passado a
// ele. Este usa o axios REAL com um adapter que captura a requisição, para
// validar a URL final (baseURL + caminho) — a que de fato chega ao servidor.
let urls: string[] = [];

beforeEach(() => {
  urls = [];
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    urls.push(api.getUri(config));
    return { data: [], status: 200, statusText: 'OK', headers: {}, config };
  };
});

const chamadas: [string, () => Promise<unknown>][] = [
  ['analises', () => analisesApi.listar({})],
  ['auditoria', () => auditoriaApi.listar({})],
  ['auth/me', () => authApi.me()],
  ['usuarios/me', () => authApi.profile()],
  ['chaves-api', () => chavesApi.listar()],
  ['configuracao', () => configuracaoApi.obter()],
  ['equipamentos', () => equipamentosApi.listar({})],
  ['lotes', () => lotesApi.listar({})],
  ['organizacoes', () => organizacoesApi.listar({})],
  ['relatorios', () => relatoriosApi.financeiro('2026-01-01', '2026-12-31')],
  ['tarefas', () => tarefasApi.listar({})],
  ['usuarios', () => usuariosApi.listar({})],
];

describe('URL final das requisições', () => {
  it.each(chamadas)('%s não duplica o prefixo da API', async (_nome, chamar) => {
    await chamar().catch(() => undefined); // só a URL importa, não o parse da resposta
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/^\/api\/v1\/[a-z]/);
    expect(urls[0]).not.toContain('/api/v1/api/v1');
  });
});
