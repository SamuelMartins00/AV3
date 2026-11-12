import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="py-12">
      <p className="text-sm font-semibold text-emerald-800">Erro 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950">Página não encontrada</h1>
      <p className="mt-3 text-slate-600">O endereço acessado não corresponde a uma rota disponível.</p>
      <Link className="mt-6 inline-flex rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800" to="/">
        Voltar ao início
      </Link>
    </section>
  );
}
