export function HomePage() {
  return (
    <section className="max-w-3xl">
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
        Fundação do frontend
      </span>
      <h1 className="mt-5 text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
        Tecnologia a serviço de um futuro mais circular.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
        O ambiente inicial do GreenCode está preparado. A estrutura de navegação e a
        integração com a API serão desenvolvidas progressivamente nas próximas fases.
      </p>
      <div className="mt-9 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-emerald-950">Ambiente inicial</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Nenhum módulo operacional ou fluxo de autenticação foi habilitado nesta fase.
        </p>
      </div>
    </section>
  );
}
