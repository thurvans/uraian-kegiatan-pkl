import { AlertTriangle, CheckCircle2, X } from './icons.jsx';

const statusStyle = {
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-700',
  SUBMITTED: 'border-amber-200 bg-amber-50 text-amber-800',
  RETURNED: 'border-red-200 bg-red-50 text-red-700',
  SIGNED: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};
const statusDot = { DRAFT: 'bg-slate-400', SUBMITTED: 'bg-amber-500', RETURNED: 'bg-red-500', SIGNED: 'bg-emerald-500' };
const statusLabel = { DRAFT: 'Draf', SUBMITTED: 'Menunggu', RETURNED: 'Perlu revisi', SIGNED: 'Ditandatangani' };

export function PanelLoading() {
  return <div className="card animate-pulse"><div className="h-5 w-36 rounded bg-slate-200"/><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="h-11 rounded-xl bg-slate-100"/><div className="h-11 rounded-xl bg-slate-100"/><div className="h-11 rounded-xl bg-slate-100 sm:col-span-2"/></div></div>;
}

export function Notice({ value, clear }) {
  if (!value) return null;
  const error = value.type === 'error';
  return <div className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status"><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${error ? 'bg-red-100' : 'bg-emerald-100'}`}>{error ? <AlertTriangle size={14}/> : <CheckCircle2 size={14}/>}</span><span className="flex-1 leading-6">{value.text}</span><button className="rounded-lg p-1 transition hover:bg-black/5" onClick={clear} aria-label="Tutup pemberitahuan"><X size={16}/></button></div>;
}

export function Status({ value }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[value] || statusStyle.DRAFT}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot[value] || statusDot.DRAFT}`}/>{statusLabel[value] || value}</span>;
}
