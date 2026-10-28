import { useEffect } from 'react';
import { X } from './icons.jsx';

export function ModalFrame({ open, onClose, title, description, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', close);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-3xl border border-white/50 bg-white shadow-2xl`}><header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}</div><button className="icon-btn h-9 w-9 shrink-0 border-0 shadow-none" onClick={onClose} aria-label="Tutup dialog"><X size={18}/></button></header>{children}</section></div>;
}

export function ConfirmModal({ config, busy, onClose }) {
  const danger = config?.tone === 'danger';
  return <ModalFrame open={Boolean(config)} onClose={onClose} title={config?.title} description={config?.description}><div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end"><button className="btn-secondary" onClick={onClose} disabled={busy}>Batal</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={config?.onConfirm} disabled={busy}>{busy ? 'Memproses…' : config?.confirmLabel || 'Lanjutkan'}</button></div></ModalFrame>;
}
