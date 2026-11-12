import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-emerald-950/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-900 text-lg font-bold text-white" aria-hidden="true">
            G
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-emerald-950">GreenCode</p>
            <p className="text-xs text-slate-500">Logística reversa inteligente</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-slate-500">
          GreenCode AV3 · Plataforma de logística reversa
        </div>
      </footer>
    </div>
  );
}
