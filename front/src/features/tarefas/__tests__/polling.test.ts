import { describe, expect, it } from 'vitest';
import { proximoIntervaloPolling } from '../hooks/use-tarefas';
import { mensagemErroDownload } from '../api';
describe('acompanhamento de tarefas',()=>{
 it('inicia polling em 2 segundos e aplica backoff até 4 segundos',()=>{expect(proximoIntervaloPolling('PENDENTE',0)).toBe(2000);expect(proximoIntervaloPolling('PROCESSANDO',2)).toBe(4000);});
 it('interrompe polling em estados terminais',()=>{expect(proximoIntervaloPolling('CONCLUIDA',4)).toBe(false);expect(proximoIntervaloPolling('FALHOU',4)).toBe(false);expect(proximoIntervaloPolling('CANCELADA',4)).toBe(false);});
 it('distingue resultado ainda indisponível de resultado expirado',()=>{expect(mensagemErroDownload(409)).toContain('não está disponível');expect(mensagemErroDownload(410)).toContain('expirou');});
});
