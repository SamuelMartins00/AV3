import {beforeEach,describe,expect,it,vi,type Mock} from 'vitest';
import {api} from '../../../lib/api';
import {usuariosApi} from '../api';
vi.mock('../../../lib/api',()=>({api:{get:vi.fn(),post:vi.fn(),patch:vi.fn(),put:vi.fn(),delete:vi.fn()}}));
const mocked=api as unknown as {get:Mock;post:Mock;patch:Mock;put:Mock;delete:Mock};
beforeEach(()=>vi.clearAllMocks());
describe('usuariosApi',()=>{
 it('envia senhaAtualAdmin ao criar administrador',async()=>{mocked.post.mockResolvedValueOnce({data:{id:1}} as never);await usuariosApi.criar({usuario:'admin2',nomeExibicao:'Admin 2',senha:'senha-segura',papel:'ADMINISTRADOR',senhaAtualAdmin:'senha-admin'});expect(mocked.post).toHaveBeenCalledWith('/usuarios',expect.objectContaining({senhaAtualAdmin:'senha-admin'}));});
 it('envia senhaAtualAdmin na promoção administrativa',async()=>{mocked.patch.mockResolvedValueOnce({data:{id:2}} as never);await usuariosApi.atualizar(2,{papel:'ADMINISTRADOR',senhaAtualAdmin:'senha-admin'});expect(mocked.patch).toHaveBeenCalledWith('/usuarios/2',{papel:'ADMINISTRADOR',senhaAtualAdmin:'senha-admin'});});
 it('usa endpoint de redefinição de senha',async()=>{mocked.put.mockResolvedValueOnce({data:null} as never);await usuariosApi.redefinirSenha(7,'senha-nova-segura');expect(mocked.put).toHaveBeenCalledWith('/usuarios/7/senha',{senhaNova:'senha-nova-segura'});});
});
