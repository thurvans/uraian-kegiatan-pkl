import { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, Plus, Save, Trash2 } from '../components/icons.jsx';
import { api } from '../api.js';
import { DateInput, TimeInput } from '../components/DateTimeInput.jsx';
import { Notice } from '../components/Feedback.jsx';
import { ConfirmModal, ModalFrame } from '../components/Modal.jsx';
import { PAGE_SIZE, Pagination } from '../components/Pagination.jsx';
import { Empty } from '../components/reports/ReportComponents.jsx';
import { Page } from '../layouts/AppLayout.jsx';
import { dateValue, fmtDate, fmtDateShort, fmtDay, fmtTimeRange } from '../utils/formatters.js';

const emptyActivity = { activityDate: '', workMode: 'OFFICE', startTime: '08:00', endTime: '16:00', description: '' };

function SelectAllCheckbox({ checked, indeterminate, disabled, onChange }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} className="h-4 w-4 rounded border-slate-300 accent-navy-900" type="checkbox" checked={checked} disabled={disabled} onChange={onChange} aria-label="Pilih semua kegiatan"/>;
}

export default function ActivitiesPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState(emptyActivity);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState([]);
  const [page, setPage] = useState(1);
  const load = useCallback(() => api('/activities').then(result => {
    setItems(result.data);
    setSelected(current => current.filter(id => result.data.some(item => item.id === id)));
  }).catch(error => setNotice({ type: 'error', text: error.message })), []);
  useEffect(() => { void load(); }, [load]);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  useEffect(() => { setPage(current => Math.min(current, totalPages)); }, [totalPages]);
  const paginatedItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeForm = () => { if (busy) return; setFormOpen(false); setEditId(null); setForm(emptyActivity); };
  const openAdd = () => { setEditId(null); setForm(emptyActivity); setFormOpen(true); };
  const changeWorkMode = workMode => setForm(current => {
    if (workMode === current.workMode) return current;
    if (workMode === 'WFH') return { ...current, workMode, previousStartTime: current.startTime, previousEndTime: current.endTime, startTime: 'WFH', endTime: 'WFH' };
    return { ...current, workMode, startTime: current.previousStartTime || '08:00', endTime: current.previousEndTime || '16:00' };
  });
  const submit = async event => {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api(editId ? `/activities/${editId}` : '/activities', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      setNotice({ type: 'success', text: result.message }); setFormOpen(false); setEditId(null); setForm(emptyActivity); await load();
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const edit = item => {
    setEditId(item.id);
    setForm({ activityDate: dateValue(item.activityDate), workMode: item.startTime === 'WFH' ? 'WFH' : 'OFFICE', startTime: item.startTime, endTime: item.endTime, description: item.description });
    setFormOpen(true);
  };
  const remove = async () => {
    if (!pendingDelete.length) return;
    setBusy(true);
    try {
      const result = await api('/activities/batch', { method: 'DELETE', body: JSON.stringify({ activityIds: pendingDelete.map(item => item.id) }) });
      setNotice({ type: 'success', text: result.message }); setPendingDelete([]); setSelected([]); await load();
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const toggleAll = () => setSelected(current => items.length > 0 && items.every(item => current.includes(item.id)) ? [] : items.map(item => item.id));
  const allSelected = items.length > 0 && items.every(item => selected.includes(item.id));
  const someSelected = !allSelected && items.some(item => selected.includes(item.id));
  const deleteConfig = pendingDelete.length ? {
    title: pendingDelete.length === 1 ? 'Hapus kegiatan?' : `Hapus ${pendingDelete.length} kegiatan?`,
    description: pendingDelete.length === 1 ? `Kegiatan pada ${fmtDate(pendingDelete[0].activityDate)} akan dihapus permanen.` : 'Seluruh kegiatan terpilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
    confirmLabel: pendingDelete.length === 1 ? 'Ya, hapus' : 'Ya, hapus semua', tone: 'danger', onConfirm: remove
  } : null;

  return <Page title="Kegiatan harian" description="Catat pekerjaan setiap hari kerja. Satu tanggal hanya memiliki satu uraian kegiatan." eyebrow="Jurnal aktivitas" action={<button type="button" className="btn-primary" onClick={openAdd}><Plus size={17}/> Tambah kegiatan</button>}>
    <Notice value={notice} clear={() => setNotice(null)}/>
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="section-title">Riwayat kegiatan</h2><p className="mt-1 text-xs text-slate-500">{items.length} kegiatan telah tercatat.</p></div>
        {selected.length > 0 && <button type="button" className="btn-danger" onClick={() => setPendingDelete(items.filter(item => selected.includes(item.id)))}><Trash2 size={16}/> Hapus pilihan <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">{selected.length}</span></button>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Riwayat kegiatan harian</caption>
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-[.08em] text-slate-500"><tr><th className="w-24 px-5 py-3.5"><label className="flex cursor-pointer items-center gap-2"><SelectAllCheckbox checked={allSelected} indeterminate={someSelected} disabled={!items.length} onChange={toggleAll}/><span>Semua</span></label></th><th className="px-5 py-3.5">Hari/tanggal</th><th className="px-5 py-3.5">Waktu</th><th className="px-5 py-3.5">Uraian kegiatan</th><th className="px-5 py-3.5 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{items.length ? paginatedItems.map(item => <tr key={item.id} className={`transition hover:bg-blue-50/35 ${selected.includes(item.id) ? 'bg-blue-50/60' : ''}`}><td className="px-5 py-4"><input className="h-4 w-4 accent-navy-900" type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} aria-label={`Pilih kegiatan ${fmtDate(item.activityDate)}`}/></td><td className="whitespace-nowrap px-5 py-4"><p className="font-bold text-slate-900">{fmtDay(item.activityDate)}</p><p className="mt-0.5 text-xs text-slate-500">{fmtDateShort(item.activityDate)}</p></td><td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">{fmtTimeRange(item.startTime, item.endTime)}</td><td className="max-w-2xl whitespace-pre-line px-5 py-4 leading-6 text-slate-600">{item.description}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" className="icon-btn" onClick={() => edit(item)} title="Ubah kegiatan" aria-label="Ubah kegiatan"><PenLine size={16}/></button><button type="button" className="icon-btn text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setPendingDelete([item])} title="Hapus kegiatan" aria-label="Hapus kegiatan"><Trash2 size={16}/></button></div></td></tr>) : <tr><td colSpan="5"><Empty compact title="Belum ada kegiatan" text="Mulai catat kegiatan hari kerja pertama Anda melalui tombol Tambah kegiatan."/></td></tr>}</tbody>
          </table>
        </div>
        <Pagination page={page} totalItems={items.length} onPageChange={setPage}/>
      </div>
    </section>
    <ModalFrame open={formOpen} onClose={closeForm} title={editId ? 'Ubah kegiatan' : 'Tambah kegiatan'} description={editId ? 'Perbarui uraian atau waktu kegiatan yang dipilih.' : 'Catat pekerjaan untuk satu hari kerja.'} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-4 p-6">
        <label><span className="label">Tanggal kegiatan</span><DateInput value={form.activityDate} disabled={Boolean(editId)} onChange={value => setForm({ ...form, activityDate: value })}/><span className="hint">Format dd/mm/yyyy · hanya Senin–Jumat dalam periode PKL.</span></label>
        <fieldset><legend className="label">Mode kerja</legend><div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">{[['OFFICE','Jam kerja'],['WFH','WFH']].map(([value,label]) => <button key={value} type="button" onClick={() => changeWorkMode(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${form.workMode === value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div></fieldset>
        {form.workMode === 'WFH' ? <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">Kolom waktu pada laporan akan ditampilkan sebagai <b>WFH</b>.</div> : <div className="grid grid-cols-2 gap-3"><label><span className="label">Waktu mulai</span><TimeInput label="Pilih waktu mulai" value={form.startTime} onChange={value => setForm({ ...form, startTime: value })}/><span className="hint">Format 24 jam</span></label><label><span className="label">Waktu selesai</span><TimeInput label="Pilih waktu selesai" value={form.endTime} onChange={value => setForm({ ...form, endTime: value })}/><span className="hint">Format 24 jam</span></label></div>}
        <label><span className="label">Uraian kegiatan</span><textarea className="field min-h-40 resize-y leading-6" minLength={5} maxLength={5000} required placeholder="Jelaskan pekerjaan dan hasil yang diselesaikan…" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/><span className="mt-1.5 flex justify-between text-xs text-slate-400"><span>Minimal 5 karakter</span><span>{form.description.length}/5000</span></span></label>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" onClick={closeForm} disabled={busy}>Batal</button><button className="btn-primary" disabled={busy}><Save size={17}/>{busy ? 'Menyimpan…' : editId ? 'Simpan perubahan' : 'Simpan kegiatan'}</button></div>
      </form>
    </ModalFrame>
    <ConfirmModal config={deleteConfig} busy={busy} onClose={() => setPendingDelete([])}/>
  </Page>;
}
