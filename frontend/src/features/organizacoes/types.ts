export interface Contrato {
  id: number; dataAssinatura: string; dataVencimento: string; clausulas: string[];
  valorMensal: number; renovacaoAutomatica: boolean; duracaoRenovacaoMeses: number | null;
  encerradoEm: string | null; motivoEncerramento: string | null; versao: number; vigente: boolean;
}
export interface Organizacao {
  id: number; razaoSocial: string; cnpj: string; inscricaoEstadual: string | null;
  enderecoCompleto: string; telefone: string | null; email: string | null;
  dataCadastro: string; ativo: boolean; versao: number; contrato: Contrato | null;
}
export interface OrganizacaoOpcao { id: number; razaoSocial: string; ativo: boolean }
export interface Paginacao { page: number; limit: number; total: number; totalPages: number }
export interface OrganizacoesResponse { items: Organizacao[]; pagination: Paginacao }
export interface FiltrosOrganizacoes { page?: number; limit?: number; todas?: boolean; razaoSocial?: string; cnpj?: string; ativo?: boolean }
export interface DadosContrato {
  dataAssinatura?: string; dataVencimento: string; clausulas?: string[]; valorMensal: number;
  renovacaoAutomatica?: boolean; duracaoRenovacaoMeses?: number;
}
export interface CriarOrganizacao {
  razaoSocial: string; cnpj: string; inscricaoEstadual?: string;
  enderecoCompleto: string; telefone?: string; email?: string; contrato?: DadosContrato;
}
