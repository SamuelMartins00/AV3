import { useLocation } from 'react-router-dom';
const labels: Record<string, { title: string; description: string }> = {
  organizacoes: { title: 'Organizações', description: 'Gestão de organizações e contratos.' },
  lotes: { title: 'Lotes', description: 'Recebimento e acompanhamento de lotes.' },
  equipamentos: { title: 'Equipamentos', description: 'Consulta, rastreabilidade e operações de equipamentos.' },
  relatorios: { title: 'Relatórios', description: 'Consulta de relatórios operacionais e financeiros.' },
  analises: { title: 'Análises', description: 'Execução e consulta de análises.' },
  tarefas: { title: 'Tarefas', description: 'Acompanhamento de processamento assíncrono.' },
  auditoria: { title: 'Auditoria', description: 'Consulta do journal de auditoria.' },
  'chaves-api': { title: 'Chaves de API', description: 'Administração das credenciais da API pública.' },
  usuarios: { title: 'Usuários', description: 'Administração de usuários e permissões.' },
  configuracao: { title: 'Configuração', description: 'Parâmetros globais do sistema.' },
};
export function ModulePlaceholderPage() {
  const { pathname } = useLocation();
  const key = pathname.split('/').filter(Boolean)[0] ?? '';
  const module = labels[key] ?? { title: 'Módulo', description: 'Área reservada para implementação em fase posterior.' };
  return <section className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">GreenCode · Módulo</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{module.title}</h1><p className="mt-2 text-slate-600">{module.description}</p><div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8"><div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-900" aria-hidden="true">⌘</div><h2 className="mt-4 font-semibold text-slate-900">Estrutura de navegação pronta</h2><p className="mt-2 text-sm leading-6 text-slate-500">A tela funcional deste módulo será construída na fase correspondente. Nenhuma operação ou dado fictício é apresentado nesta etapa.</p></div></section>;
}
