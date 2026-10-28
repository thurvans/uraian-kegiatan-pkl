import { useEffect, useState } from 'react';
import { Download, Send } from '../components/icons.jsx';
import { api, download } from '../api.js';
import { Notice } from '../components/Feedback.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { ReportTable } from '../components/reports/ReportComponents.jsx';
import { Page } from '../layouts/AppLayout.jsx';

export default function InternReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    return api('/reports')
      .then(result => {
        const data = result?.data || [];
        setReports(data);
        setSelected(current => current.filter(id => data.some(report => report.id === id && ['DRAFT', 'RETURNED'].includes(report.status))));
      })
      .catch(error => {
        setNotice({ type: 'error', text: error.message });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => { load(true); }, []);
  const submit = async () => {
    setBusy(true);
    try { const result = await api(`/reports/${pendingSubmit.id}/submit`, { method: 'POST' }); setNotice({ type: 'success', text: result.message }); setPendingSubmit(null); await load(); }
    catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const action = report => <div className="flex justify-end gap-2">{['DRAFT','RETURNED'].includes(report.status) && <button className="btn-secondary min-h-9 px-3 py-2" onClick={() => setPendingSubmit(report)}><Send size={15}/> Ajukan</button>}{report.status === 'SIGNED' && <button className="btn-secondary min-h-9 px-3 py-2" onClick={() => download(`/reports/${report.id}/pdf`, 'laporan.pdf').catch(error => setNotice({ type: 'error', text: error.message }))}><Download size={15}/> PDF</button>}</div>;
  const eligible = reports.filter(report => ['DRAFT', 'RETURNED'].includes(report.status));
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const toggleAll = () => setSelected(current => eligible.length > 0 && eligible.every(report => current.includes(report.id)) ? [] : eligible.map(report => report.id));
  const submitSelected = async () => {
    setBusy(true);
    try {
      const result = await api('/reports/submit-batch', { method: 'POST', body: JSON.stringify({ reportIds: selected }) });
      setNotice({ type: 'success', text: result.message }); setPendingSubmit(null); setSelected([]); load();
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  };
  const placementId = reports[0]?.placementId;
  const submitConfig = pendingSubmit === 'batch'
    ? { title: 'Ajukan laporan terpilih?', description: `${selected.length} laporan akan dikunci sementara dan dikirim kepada mentor untuk ditinjau.`, confirmLabel: 'Ya, ajukan semua', onConfirm: submitSelected }
    : pendingSubmit ? { title: 'Ajukan laporan ini?', description: `Minggu ${pendingSubmit.weekIndex} akan dikunci sementara dan dikirim kepada mentor untuk ditinjau.`, confirmLabel: 'Ya, ajukan', onConfirm: submit } : null;
  return <Page title="Laporan PKL" description="Pantau status laporan mingguan dan unduh dokumen yang sudah ditandatangani." eyebrow="Arsip laporan" action={<div className="flex flex-wrap gap-2">{selected.length > 0 && <button className="btn-primary" disabled={busy} onClick={() => setPendingSubmit('batch')}><Send size={16}/> Ajukan pilihan <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">{selected.length}</span></button>}{placementId && <button className="btn-secondary" onClick={() => download(`/placements/${placementId}/pdf`, 'periode.pdf').catch(error => setNotice({ type: 'error', text: error.message }))}><Download size={16}/> Unduh seluruh periode</button>}</div>}><Notice value={notice} clear={() => setNotice(null)}/>{selected.length > 0 && <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3"><p className="text-sm text-blue-900"><b>{selected.length} laporan</b> siap diajukan.</p><button className="text-xs font-bold text-blue-700 hover:text-blue-900" onClick={() => setSelected([])}>Batalkan pilihan</button></div>}<ReportTable reports={reports} loading={loading} actions={action} selected={selected} onSelect={toggle} onSelectAll={toggleAll} canSelect={report => ['DRAFT', 'RETURNED'].includes(report.status)}/><ConfirmModal config={submitConfig} busy={busy} onClose={() => setPendingSubmit(null)}/></Page>;
}

