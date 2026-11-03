import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from './icons.jsx';

export function ModalFrame({ open, onClose, title, description, children, maxWidth = 'max-w-lg' }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const handleKey = event => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previousFocus?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102a33]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-xl bg-white shadow-[0_24px_70px_rgba(16,42,51,.24)]`}>
        <header className="flex items-start justify-between gap-4 border-b border-[#e4e9e6] px-6 py-5">
          <div><h2 id="modal-title" className="text-lg font-semibold tracking-[-.015em] text-[#15282e]">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-[#627278]">{description}</p>}</div>
          <button ref={closeRef} className="icon-btn h-9 w-9 shrink-0 border-0" onClick={onClose} aria-label="Tutup dialog"><X size={18}/></button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function ConfirmModal({ config, busy, onClose }) {
  const danger = config?.tone === 'danger';
  return <ModalFrame open={Boolean(config)} onClose={onClose} title={config?.title} description={config?.description}><div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end"><button className="btn-secondary" onClick={onClose} disabled={busy}>Batal</button><button className={danger ? 'btn-danger' : 'btn-primary'} onClick={config?.onConfirm} disabled={busy}>{busy ? 'Memproses…' : config?.confirmLabel || 'Lanjutkan'}</button></div></ModalFrame>;
}
