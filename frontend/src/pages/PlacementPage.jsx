import { useEffect, useState } from 'react';
import { Building2, Save, ShieldCheck } from '../components/icons.jsx';
import { api } from '../api.js';
import { DateInput } from '../components/DateTimeInput.jsx';
import { Notice, PanelLoading } from '../components/Feedback.jsx';
import { Page } from '../layouts/AppLayout.jsx';
import { dateValue } from '../utils/formatters.js';

export default function PlacementPage() {
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/placements/me').then(result => setForm({ ...result.data, startDate: dateValue(result.data.startDate), endDate: dateValue(result.data.endDate) })).catch(error => setNotice({ type: 'error', text: error.message })); }, []);
  const submit = async event => {
    event.preventDefault(); setBusy(true);
    try { const result = await api('/placements/me', { method: 'PUT', body: JSON.stringify(form) }); setNotice({ type: 'success', text: result.message }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const fields = [['officeName','Nama kantor/instansi',200],['region','Wilayah',150],['division','Bagian/unit',150],['position','Jabatan/tugas',100]];
  return <Page title="Identitas penempatan" description="Informasi ini digunakan sebagai header pada tampilan laporan dan dokumen PDF." eyebrow="Data PKL"><Notice value={notice} clear={() => setNotice(null)}/>{!form ? <PanelLoading/> : <div className="grid gap-6 xl:grid-cols-[1fr_300px]"><form onSubmit={submit} className="card"><div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 size={19}/></span><div><h2 className="section-title">Informasi instansi</h2><p className="mt-0.5 text-xs text-slate-500">Pastikan penulisan sesuai dokumen resmi.</p></div></div><div className="grid gap-5 sm:grid-cols-2">{fields.map(([key,label,max]) => <label key={key} className={key === 'officeName' ? 'sm:col-span-2' : ''}><span className="label">{label}</span><input className="field" required maxLength={max} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })}/></label>)}<label><span className="label">Periode mulai</span><DateInput value={form.startDate} onChange={value => setForm({ ...form, startDate: value })}/><span className="hint">Format dd/mm/yyyy</span></label><label><span className="label">Periode selesai</span><DateInput value={form.endDate} onChange={value => setForm({ ...form, endDate: value })}/><span className="hint">Format dd/mm/yyyy</span></label></div><div className="mt-7 flex justify-end border-t border-slate-100 pt-5"><button className="btn-primary" disabled={busy}><Save size={17}/>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button></div></form><aside className="space-y-4"><div className="card"><p className="eyebrow">Mentor terhubung</p><div className="mt-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-700">{form.mentor.name[0]}</div><div><p className="text-sm font-bold text-slate-900">{form.mentor.name}</p><p className="text-xs text-slate-500">{form.mentor.email}</p></div></div></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><ShieldCheck className="text-blue-700" size={21}/><p className="mt-3 text-sm font-bold text-blue-950">Data terkunci setelah validasi</p><p className="mt-1 text-xs leading-5 text-blue-800/75">Periode tidak dapat diubah jika sudah ada laporan yang ditandatangani mentor.</p></div></aside></div>}</Page>;
}

