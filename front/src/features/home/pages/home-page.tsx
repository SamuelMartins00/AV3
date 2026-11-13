import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAuth } from '../../auth/auth-context';
import { useToast } from '../../../app/toast-provider';
import { organizacoesApi } from '../../organizacoes/api';
import type { Organizacao } from '../../organizacoes/types';
import { lotesApi } from '../../lotes/api';
import { equipamentosApi } from '../../equipamentos/api';
import { tarefasApi } from '../../tarefas/api';
import { analisesApi } from '../../analises/api';
import type { ResultadoAnalise } from '../../analises/types';
import { auditoriaApi } from '../../auditoria/api';
import { relatoriosApi, statusRastreamento } from '../../relatorios/api';
import {
  resumirEquipamentos, resumirLotes, resumirOrganizacoes, resumirTarefas,
  resumirTiposAnalise, numeroFinito,
} from '../dashboard-metrics';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const date = (value: unknown) => typeof value === 'string' && value ? new Date(value).toLocaleDateString('pt-BR') : '—';
const palette = ['#047857', '#0f766e', '#0e7490', '#2563eb', '#7c3aed', '#d97706', '#be123c', '#64748b'];

async function carregarOrganizacoes(): Promise<Organizacao[]> {
  const first = await organizacoesApi.listar({ page: 1, limit: 100 });
  if (first.pagination.totalPages <= 1) return first.items;
  const pages = await Promise.all(
    Array.from({ length: first.pagination.totalPages - 1 }, (_, index) =>
      organizacoesApi.listar({ page: index + 2, limit: 100 }),
    ),
  );
  return [...first.items, ...pages.flatMap((page) => page.items)];
}

type CountPoint = { name: string; quantidade: number };
function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-bold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}</div>
      {action}
    </div>
    {children}
  </section>;
}
function Metric({ label, value, detail, icon }: { label: string; value: string | number; detail?: string; icon: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-800">{icon}</span></div>
    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
    {detail && <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>}
  </div>;
}
function Skeleton({ rows = 2 }: { rows?: number }) {
  return <div aria-label="Carregando dados" role="status" className="animate-pulse space-y-3">
    <span className="sr-only">Carregando dados do painel…</span>
    {Array.from({ length: rows }, (_, index) => <div key={index} className="h-5 rounded-lg bg-slate-100" />)}
  </div>;
}
function QueryMessage({ loading, error, empty, onRetry }: { loading?: boolean; error?: boolean; empty?: boolean; onRetry?: () => void }) {
  if (loading) return <Skeleton />;
  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Não foi possível carregar estes dados. <button type="button" onClick={onRetry} className="ml-1 font-semibold underline">Tentar novamente</button></div>;
  if (empty) return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Ainda não há dados para apresentar.</p>;
  return null;
}
function BarPanel({ title, subtitle, data, loading, error, retry }: { title: string; subtitle?: string; data: CountPoint[]; loading?: boolean; error?: boolean; retry?: () => void }) {
  const state = <QueryMessage loading={loading} error={error} empty={!loading && !error && (data.length === 0 || data.every((item) => item.quantidade === 0))} onRetry={retry} />;
  return <Panel title={title} subtitle={subtitle}>
    {state ?? <><div className="h-64 w-full" role="img" aria-label={`${title}: ${data.map((item) => `${item.name}: ${item.quantidade}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-18} textAnchor="end" interval={0} height={55} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="quantidade" name="Quantidade" fill="#047857" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div><p className="sr-only">{data.map((item) => `${item.name}: ${item.quantidade}`).join('. ')}</p></>}
  </Panel>;
}
function PiePanel({ title, subtitle, data, loading, error, retry }: { title: string; subtitle?: string; data: CountPoint[]; loading?: boolean; error?: boolean; retry?: () => void }) {
  const state = <QueryMessage loading={loading} error={error} empty={!loading && !error && data.every((item) => item.quantidade === 0)} onRetry={retry} />;
  return <Panel title={title} subtitle={subtitle}>
    {state ?? <><div className="h-64 w-full" role="img" aria-label={`${title}: ${data.map((item) => `${item.name}: ${item.quantidade}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.filter((item) => item.quantidade > 0)} dataKey="quantidade" nameKey="name" cx="50%" cy="48%" outerRadius="75%" label={({ name, value }) => `${name}: ${value}`}>
            {data.map((item, index) => <Cell key={item.name} fill={palette[index % palette.length]} />)}
          </Pie>
          <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div><p className="sr-only">{data.map((item) => `${item.name}: ${item.quantidade}`).join('. ')}</p></>}
  </Panel>;
}
function DashboardHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Visão geral</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</div>;
}
function QuickLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="inline-flex items-center gap-2 rounded-xl border border-emerald-800/15 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">{children}<span aria-hidden="true">↗</span></Link>;
}
function AnalysisInsights({ analyses, loading, error, retry }: { analyses: ResultadoAnalise[]; loading: boolean; error: boolean; retry: () => void }) {
  const efficiency = analyses.find((item) => item.tipo === 'EFICIENCIA_OPERACIONAL');
  const profitability = analyses.find((item) => item.tipo === 'RENTABILIDADE_EQUIPAMENTOS');
  const usefulLife = analyses.find((item) => item.tipo === 'VIDA_UTIL_REMANESCENTE');
  const efficiencyData = efficiency?.dados ?? {};
  const profitabilityData = profitability?.dados ?? {};
  const lifeData = usefulLife?.dados ?? {};
  const groups = Array.isArray(profitabilityData.grupos) ? profitabilityData.grupos as Record<string, unknown>[] : [];
  const predictions = Array.isArray(lifeData.previsoes) ? lifeData.previsoes as Record<string, unknown>[] : [];
  const limitations = Array.isArray(lifeData.limitacoes) ? lifeData.limitacoes.filter((item): item is string => typeof item === 'string') : [];
  const hasAnalysis = analyses.length > 0;
  if (loading || error || !hasAnalysis) return <Panel title="Indicadores das análises" subtitle="Dados provenientes dos resultados analíticos persistidos.">
    <QueryMessage loading={loading} error={error} empty={!loading && !error && !hasAnalysis} onRetry={retry} />
  </Panel>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900">Indicadores das análises</h2><p className="mt-1 text-xs text-slate-500">Últimos resultados disponíveis no histórico analítico.</p></div><QuickLink to="/analises">Abrir análises</QuickLink></div>
    {efficiency && <Panel title="Eficiência operacional" subtitle={`Resultado gerado em ${date(efficiency.geradoEm)} · duração entre recebimento e conclusão da triagem`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {([
          ['Média (horas)', efficiencyData.mediaHoras],
          ['Mínimo (horas)', efficiencyData.minimoHoras],
          ['Máximo (horas)', efficiencyData.maximoHoras],
          ['Amostra', efficiencyData.amostra],
          ['Status da amostra', efficiencyData.statusAmostra],
        ] as Array<[string, unknown]>).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {value === null || value === undefined
                ? 'Não disponível'
                : typeof value === 'number'
                  ? number.format(value)
                  : String(value)}
            </p>
          </div>
        ))}
      </div>
      {typeof efficiencyData.observacao === 'string' && <p className="mt-3 text-xs leading-5 text-slate-500">{efficiencyData.observacao}</p>}
    </Panel>}
    {profitability && <Panel title="Rentabilidade de equipamentos" subtitle={`Avaliações consideradas: ${number.format(numeroFinito(profitabilityData.amostraAvaliacoes) ?? 0)} · médias de valores estimados por grupo`}>
      {groups.length === 0 ? <p className="text-sm text-slate-500">Não há grupos disponíveis neste resultado.</p> : <div className="h-72 w-full" role="img" aria-label="Média de valores estimados por grupo de equipamentos">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groups.map((group) => ({ grupo: [group.tipo, group.estadoFisicoSnapshot, group.marca, group.modelo].filter(Boolean).join(' · '), media: numeroFinito(group.mediaValorEstimado) ?? 0, avaliacoes: numeroFinito(group.quantidadeEstimativas) ?? 0 }))} margin={{ top: 8, right: 10, left: 0, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="grupo" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} height={90} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value, name) => [name === 'Média estimada' ? currency.format(Number(value)) : number.format(Number(value)), name]} /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="media" name="Média estimada" fill="#0f766e" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>}
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2 pr-3">Grupo</th><th className="py-2 pr-3">Média estimada</th><th className="py-2">Quantidade de avaliações</th></tr></thead><tbody className="divide-y divide-slate-100">{groups.map((group, index) => <tr key={index}><td className="py-2 pr-3">{[group.tipo, group.estadoFisicoSnapshot, group.marca, group.modelo].filter(Boolean).join(' · ') || '—'}</td><td className="py-2 pr-3">{numeroFinito(group.mediaValorEstimado) === null ? 'Não disponível' : currency.format(numeroFinito(group.mediaValorEstimado)!)}</td><td className="py-2">{number.format(numeroFinito(group.quantidadeEstimativas) ?? 0)}</td></tr>)}</tbody></table></div>
      {typeof profitabilityData.observacao === 'string' && <p className="mt-3 text-xs leading-5 text-slate-500">{profitabilityData.observacao}</p>}
    </Panel>}
    {usefulLife && <Panel title="Vida útil remanescente" subtitle={`Previsões registradas: ${number.format(numeroFinito(lifeData.equipamentosAnalisados) ?? predictions.length)} · método: ${String(lifeData.metodo ?? '—')}`}>
      {predictions.length === 0 ? <p className="text-sm text-slate-500">Não há previsões disponíveis neste resultado.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Equipamento</th><th className="px-3 py-2">Previsão (dias)</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">R²</th><th className="px-3 py-2">Observações</th></tr></thead><tbody className="divide-y divide-slate-100">{predictions.map((prediction, index) => <tr key={String(prediction.equipamentoId ?? index)}><td className="px-3 py-2">{[prediction.equipamentoId, prediction.tipo, prediction.marca, prediction.modelo].filter(Boolean).join(' · ')}</td><td className="px-3 py-2">{numeroFinito(prediction.vidaRemanescenteDias) === null ? 'Não disponível' : number.format(numeroFinito(prediction.vidaRemanescenteDias)! )}</td><td className="px-3 py-2">{String(prediction.status ?? '—')}</td><td className="px-3 py-2">{numeroFinito(prediction.r2) === null ? 'Não disponível' : number.format(numeroFinito(prediction.r2)!)}</td><td className="px-3 py-2">{number.format(numeroFinito(prediction.observacoes) ?? 0)}</td></tr>)}</tbody></table></div>}
      {limitations.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-amber-950">Limitações informadas pela análise</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-950">{limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></div>}
    </Panel>}
    {!efficiency && !profitability && !usefulLife && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">O histórico carregado ainda não contém resultados dos três tipos de análise.</p>}
  </div>;
}

export function HomePage() {
  const { user } = useAuth();
  const role = user?.papel;
  const isAdmin = role === 'ADMINISTRADOR';
  const isOperator = role === 'OPERADOR_CADASTRO';
  const isManager = role === 'GESTOR_ALMOXARIFADO';
  const isAuditor = role === 'AUDITOR';
  const needsOrganizations = isAdmin || isOperator;
  const needsOperations = isAdmin || isManager;
  const needsInsights = isAdmin || isAuditor;

  const organizations = useQuery({ queryKey: ['dashboard', 'organizacoes'], queryFn: carregarOrganizacoes, enabled: needsOrganizations, staleTime: 60_000 });
  const lots = useQuery({ queryKey: ['dashboard', 'lotes'], queryFn: () => lotesApi.listar({}), enabled: needsOperations, staleTime: 60_000 });
  const equipments = useQuery({ queryKey: ['dashboard', 'equipamentos'], queryFn: () => equipamentosApi.listar({}), enabled: needsOperations, staleTime: 60_000 });
  const tasks = useQuery({ queryKey: ['dashboard', 'tarefas'], queryFn: () => tarefasApi.listar({ pagina: 1, limite: 100 }), enabled: needsInsights, refetchInterval: (query) => query.state.data?.dados.some((item) => item.status === 'PENDENTE' || item.status === 'PROCESSANDO') ? 5000 : false, staleTime: 10_000 });
  const analyses = useQuery({ queryKey: ['dashboard', 'analises'], queryFn: () => analisesApi.listar({ pagina: 1, limite: 100 }), enabled: needsInsights, staleTime: 60_000 });
  const audit = useQuery({ queryKey: ['dashboard', 'auditoria'], queryFn: () => auditoriaApi.listar({ pagina: 1, limite: 10 }), enabled: isAuditor, staleTime: 60_000 });
  const reportStatuses = useQuery({
    queryKey: ['dashboard', 'relatorios-status'],
    queryFn: async () => Promise.all(statusRastreamento.map(async (status) => {
      const result = await relatoriosApi.porStatus(status);
      return { name: status.replaceAll('_', ' '), quantidade: numeroFinito(result.quantidade) ?? 0 };
    })),
    enabled: isAuditor,
    staleTime: 60_000,
  });

  const { toast } = useToast();
  const activeQueries = [
    ...(needsOrganizations ? [organizations] : []),
    ...(needsOperations ? [lots, equipments] : []),
    ...(needsInsights ? [tasks, analyses] : []),
    ...(isAuditor ? [audit, reportStatuses] : []),
  ];
  const dashboardRefreshing = activeQueries.some((query) => query.isFetching);
  const refreshDashboard = async () => {
    const results = await Promise.all(activeQueries.map((query) => query.refetch()));
    if (results.some((result) => result.isError)) toast('Algumas fontes não puderam ser atualizadas.', 'error');
    else toast('Dashboard atualizado com os dados disponíveis.', 'success');
  };
  const refreshAction = <button type="button" onClick={() => void refreshDashboard()} disabled={dashboardRefreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"><span aria-hidden="true">↻</span>{dashboardRefreshing ? 'Atualizando…' : 'Atualizar dados'}</button>;

  const organizationContractData = useMemo(() => organizations.data ? resumirOrganizacoes(organizations.data) : [], [organizations.data]);
  const lotStatusData = useMemo(() => lots.data ? resumirLotes(lots.data) : [], [lots.data]);
  const equipmentStatusData = useMemo(() => equipments.data ? resumirEquipamentos(equipments.data) : [], [equipments.data]);
  const taskStatusData = useMemo(() => tasks.data ? resumirTarefas(tasks.data.dados) : [], [tasks.data]);
  const analysisTypeData = useMemo(() => analyses.data ? resumirTiposAnalise(analyses.data.resultados) : [], [analyses.data]);
  const activeContracts = organizations.data?.filter((organization) => organization.contrato?.vigente) ?? [];
  const activeContractValue = activeContracts.reduce((sum, organization) => sum + (organization.contrato?.valorMensal ?? 0), 0);

  if (!role) return <div className="space-y-5"><Skeleton rows={4} /><Skeleton rows={3} /></div>;

  if (isOperator) {
    return <div className="space-y-6">
      <DashboardHeader title={`Olá, ${user?.nomeExibicao ?? 'operador'}.`} description="Acompanhe as organizações cadastradas e a situação dos contratos disponíveis para sua atuação." action={refreshAction} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Organizações cadastradas" value={organizations.isLoading ? '—' : organizations.data?.length ?? 0} detail="Registros consultados pela API" icon="▦" />
        <Metric label="Organizações ativas" value={organizations.isLoading ? '—' : organizations.data?.filter((item) => item.ativo).length ?? 0} icon="●" />
        <Metric label="Contratos vigentes" value={organizations.isLoading ? '—' : activeContracts.length} icon="▤" />
        <Metric label="Valor mensal contratual vigente" value={organizations.isLoading ? '—' : currency.format(activeContractValue)} detail="Soma dos contratos vigentes carregados" icon="R$" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <PiePanel title="Situação das organizações" data={[
          { name: 'Ativas', quantidade: organizations.data?.filter((item) => item.ativo).length ?? 0 },
          { name: 'Inativas', quantidade: organizations.data?.filter((item) => !item.ativo).length ?? 0 },
        ]} loading={organizations.isLoading} error={organizations.isError} retry={() => void organizations.refetch()} />
        <BarPanel title="Situação dos contratos" subtitle="Classificação dos contratos das organizações consultadas." data={organizationContractData} loading={organizations.isLoading} error={organizations.isError} retry={() => void organizations.refetch()} />
      </div>
      <div className="flex flex-wrap gap-3"><QuickLink to="/organizacoes">Gerenciar organizações</QuickLink></div>
      {organizations.isError && <p role="alert" className="text-sm text-rose-700">Não foi possível consultar organizações e contratos. Tente novamente pela tela do módulo.</p>}
    </div>;
  }

  if (isManager) {
    const totalWeight = lots.data?.reduce((sum, lot) => sum + (numeroFinito(lot.pesoTotalKg) ?? 0), 0) ?? 0;
    return <div className="space-y-6">
      <DashboardHeader title={`Olá, ${user?.nomeExibicao ?? 'gestor'}.`} description="Visão operacional dos lotes recebidos e dos equipamentos registrados no fluxo de logística reversa." action={refreshAction} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Lotes consultados" value={lots.data?.length ?? '—'} icon="▤" />
        <Metric label="Equipamentos consultados" value={equipments.data?.length ?? '—'} icon="▣" />
        <Metric label="Equipamentos nos lotes" value={lots.isLoading ? '—' : number.format(lots.data?.reduce((sum, lot) => sum + lot.quantidadeEquipamentos, 0) ?? 0)} detail="Soma da quantidade retornada por lote" icon="⌗" />
        <Metric label="Peso total dos lotes" value={lots.isLoading ? '—' : `${number.format(totalWeight)} kg`} detail="Soma dos pesos retornados nos lotes" icon="⚖" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <BarPanel title="Lotes por status" data={lotStatusData} loading={lots.isLoading} error={lots.isError} retry={() => void lots.refetch()} />
        <BarPanel title="Equipamentos por status de rastreamento" data={equipmentStatusData} loading={equipments.isLoading} error={equipments.isError} retry={() => void equipments.refetch()} />
      </div>
      <div className="flex flex-wrap gap-3"><QuickLink to="/lotes">Abrir lotes</QuickLink><QuickLink to="/equipamentos">Abrir equipamentos</QuickLink></div>
    </div>;
  }

  if (isAuditor) {
    return <div className="space-y-6">
      <DashboardHeader title={`Olá, ${user?.nomeExibicao ?? 'auditor'}.`} description="Acompanhe relatórios consultáveis, resultados analíticos, processamento assíncrono e registros de auditoria." action={refreshAction} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Tarefas no histórico" value={tasks.data?.total ?? '—'} detail="Contagem total informada pela API" icon="◷" />
        <Metric label="Análises no histórico" value={analyses.data?.total ?? '—'} detail="Contagem total informada pela API" icon="⌁" />
        <Metric label="Registros de auditoria" value={audit.data?.total ?? '—'} detail="Contagem total informada pela API" icon="◎" />
        <Metric label="Relatórios de status" value={statusRastreamento.length} detail="Consultas por status disponíveis" icon="▥" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <BarPanel title="Tarefas por estado" subtitle="Distribuição dos até 100 registros mais recentes carregados." data={taskStatusData} loading={tasks.isLoading} error={tasks.isError} retry={() => void tasks.refetch()} />
        <BarPanel title="Relatório de equipamentos por status" subtitle="Quantidade retornada pelo relatório para cada status." data={reportStatuses.data ?? []} loading={reportStatuses.isLoading} error={reportStatuses.isError} retry={() => void reportStatuses.refetch()} />
        <BarPanel title="Histórico analítico por tipo" subtitle="Distribuição dos até 100 resultados analíticos mais recentes carregados." data={analysisTypeData} loading={analyses.isLoading} error={analyses.isError} retry={() => void analyses.refetch()} />
        <Panel title="Auditoria recente" subtitle="Últimos registros retornados pelo journal.">
          {audit.isLoading ? <Skeleton rows={4} /> : audit.isError ? <QueryMessage error onRetry={() => void audit.refetch()} /> : audit.data?.registros.length ? <div className="space-y-3">{audit.data.registros.slice(0, 6).map((record) => <div key={record.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{record.operacao} · {record.entidade}</p><p className="mt-1 truncate text-xs text-slate-500">{record.usuarioResponsavel}</p></div><time className="shrink-0 text-xs text-slate-500">{new Date(record.timestamp).toLocaleDateString('pt-BR')}</time></div>)}</div> : <p className="text-sm text-slate-500">Nenhum registro de auditoria disponível.</p>}
        </Panel>
      </div>
      <AnalysisInsights analyses={analyses.data?.resultados ?? []} loading={analyses.isLoading} error={analyses.isError} retry={() => void analyses.refetch()} />
      <div className="flex flex-wrap gap-3"><QuickLink to="/relatorios">Relatórios</QuickLink><QuickLink to="/analises">Análises</QuickLink><QuickLink to="/tarefas">Tarefas</QuickLink><QuickLink to="/auditoria">Auditoria</QuickLink></div>
    </div>;
  }

  // Administrador: cada indicador é montado a partir de módulos aos quais o papel tem acesso.
  return <div className="space-y-6">
    <DashboardHeader title={`Olá, ${user?.nomeExibicao ?? 'administrador'}.`} description="Visão administrativa consolidada a partir das consultas autorizadas de organizações, contratos, lotes, equipamentos, tarefas e análises. Não existe endpoint agregado de dashboard." action={refreshAction} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Organizações" value={organizations.data?.length ?? '—'} detail="Total de registros carregados" icon="▦" />
      <Metric label="Lotes" value={lots.data?.length ?? '—'} detail="Registros retornados pela listagem" icon="▤" />
      <Metric label="Equipamentos" value={equipments.data?.length ?? '—'} detail="Registros retornados pela listagem" icon="▣" />
      <Metric label="Tarefas" value={tasks.data?.total ?? '—'} detail="Total informado pela API" icon="◷" />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <BarPanel title="Lotes por status" data={lotStatusData} loading={lots.isLoading} error={lots.isError} retry={() => void lots.refetch()} />
      <BarPanel title="Equipamentos por status" data={equipmentStatusData} loading={equipments.isLoading} error={equipments.isError} retry={() => void equipments.refetch()} />
      <BarPanel title="Tarefas por estado" subtitle="Distribuição dos até 100 registros mais recentes carregados." data={taskStatusData} loading={tasks.isLoading} error={tasks.isError} retry={() => void tasks.refetch()} />
      <BarPanel title="Histórico analítico por tipo" subtitle="Distribuição dos até 100 resultados mais recentes carregados." data={analysisTypeData} loading={analyses.isLoading} error={analyses.isError} retry={() => void analyses.refetch()} />
      <PiePanel title="Organizações: situação cadastral" data={[
        { name: 'Ativas', quantidade: organizations.data?.filter((item) => item.ativo).length ?? 0 },
        { name: 'Inativas', quantidade: organizations.data?.filter((item) => !item.ativo).length ?? 0 },
      ]} loading={organizations.isLoading} error={organizations.isError} retry={() => void organizations.refetch()} />
      <BarPanel title="Contratos por situação" data={organizationContractData} loading={organizations.isLoading} error={organizations.isError} retry={() => void organizations.refetch()} />
    </div>
    <AnalysisInsights analyses={analyses.data?.resultados ?? []} loading={analyses.isLoading} error={analyses.isError} retry={() => void analyses.refetch()} />
    <div className="flex flex-wrap gap-3"><QuickLink to="/organizacoes">Organizações</QuickLink><QuickLink to="/lotes">Lotes</QuickLink><QuickLink to="/equipamentos">Equipamentos</QuickLink><QuickLink to="/tarefas">Tarefas</QuickLink><QuickLink to="/analises">Análises</QuickLink></div>
    {(organizations.isError || lots.isError || equipments.isError || tasks.isError || analyses.isError) && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Uma ou mais fontes de dados não puderam ser consultadas. Os demais indicadores permanecem disponíveis; tente novamente no respectivo painel.</p>}
  </div>;
}
