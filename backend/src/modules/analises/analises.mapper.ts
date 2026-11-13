export function mapearResultadoAnalitico(registro: {
  id: number; organizacaoId: number | null; tipo: string; titulo: string;
  descricao: string | null; dados: unknown; parametros: unknown;
  periodoInicio: Date | null; periodoFim: Date | null; geradoEm: Date; versaoModelo: string | null;
}) {
  return {
    id: registro.id, organizacaoId: registro.organizacaoId, tipo: registro.tipo,
    titulo: registro.titulo, descricao: registro.descricao, dados: registro.dados,
    parametros: registro.parametros, periodo: { inicio: registro.periodoInicio, fim: registro.periodoFim },
    geradoEm: registro.geradoEm, versaoModelo: registro.versaoModelo,
  };
}
