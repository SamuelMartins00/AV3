import { Modal } from './modal';
interface ConfirmDialogProps { open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger = false, onCancel, onConfirm }: ConfirmDialogProps) {
  return <Modal open={open} title={title} onClose={onCancel} footer={<><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-900 hover:bg-emerald-800'}`}>{confirmLabel}</button></>}>{message}</Modal>;
}
