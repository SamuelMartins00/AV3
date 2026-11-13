import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; kind: ToastKind }
interface ToastContextValue { toast: (message: string, kind?: ToastKind) => void; dismiss: (id: number) => void }
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextToastId++;
    setItems((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,24rem)] flex-col gap-2" aria-live="polite" aria-atomic="false">{items.map((item) => <div key={item.id} className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg ${item.kind === 'success' ? 'border-emerald-200' : item.kind === 'error' ? 'border-rose-200' : 'border-slate-200'}`} role={item.kind === 'error' ? 'alert' : 'status'}><span className={`mt-0.5 size-2 shrink-0 rounded-full ${item.kind === 'success' ? 'bg-emerald-600' : item.kind === 'error' ? 'bg-rose-600' : 'bg-sky-600'}`} /><p className="flex-1 text-slate-700">{item.message}</p><button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => dismiss(item.id)} aria-label="Fechar notificação">×</button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser utilizado dentro de ToastProvider.');
  return context;
}
