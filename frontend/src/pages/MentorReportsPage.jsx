import { useEffect, useState } from "react";
import { CheckCircle2, Eye } from "../components/icons.jsx";
import { api, getCachedApiResponse } from "../api.js";
import { Notice } from "../components/Feedback.jsx";
import { ConfirmModal, ModalFrame } from "../components/Modal.jsx";
import {
  ReportDetailModal,
  ReportTable,
} from "../components/reports/ReportComponents.jsx";
import { Page } from "../layouts/AppLayout.jsx";

function ReturnModal({ report, busy, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (report) setReason("");
  }, [report]);
  return (
    <ModalFrame
      open={Boolean(report)}
      onClose={onClose}
      title="Kembalikan untuk revisi"
      description={
        report
          ? `Berikan alasan yang jelas untuk laporan minggu ${report.weekIndex}.`
          : ""
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(reason);
        }}
        className="p-6"
      >
        <label>
          <span className="label">Alasan revisi</span>
          <textarea
            autoFocus
            className="field min-h-32 resize-y leading-6"
            minLength={5}
            maxLength={1000}
            required
            placeholder="Contoh: uraian tanggal 12 Oktober perlu diperjelas…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <span className="mt-1.5 block text-right text-xs text-slate-400">
            {reason.length}/1000
          </span>
        </label>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </button>
          <button
            className="btn-danger"
            disabled={busy || reason.trim().length < 5}
          >
            {busy ? "Memproses…" : "Kembalikan laporan"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export default function MentorReportsPage({ signedOnly = false }) {
  const reportPath = `/reports${signedOnly ? "?status=SIGNED" : "?status=SUBMITTED"}`;
  const cachedReports = getCachedApiResponse(reportPath);
  const [reports, setReports] = useState(() => cachedReports?.data || []);
  const [loading, setLoading] = useState(() => !cachedReports);
  const [internId, setInternId] = useState("");
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [signConfirm, setSignConfirm] = useState(false);
  const [returning, setReturning] = useState(null);
  const load = (showSpinner = false) => {
    if (showSpinner && !reports.length) setLoading(true);
    return api(reportPath, {
      skipCache: showSpinner && Boolean(reports.length),
    })
      .then((result) => {
        const data = result?.data || [];
        setReports(data);
        setSelected((current) =>
          current.filter((id) => data.some((report) => report.id === id)),
        );
      })
      .catch((error) => {
        setNotice({ type: "error", text: error.message });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  useEffect(() => {
    load(true);
  }, [signedOnly]);
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const interns = [
    ...new Map(
      reports
        .map((report) => [
          report.placement?.intern?.id,
          report.placement?.intern,
        ])
        .filter(([id]) => Boolean(id)),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const visibleReports = internId
    ? reports.filter((report) => report.placement?.intern?.id === internId)
    : reports;
  const toggleAll = () =>
    setSelected(
      visibleReports.length > 0 &&
        visibleReports.every((report) => selected.includes(report.id))
        ? selected.filter(
            (id) => !visibleReports.some((report) => report.id === id),
          )
        : [
            ...new Set([
              ...selected,
              ...visibleReports.map((report) => report.id),
            ]),
          ],
    );
  const selectedActivities = reports
    .filter((report) => selected.includes(report.id))
    .reduce((total, report) => total + (report.activities?.length || 0), 0);
  const sign = async () => {
    setBusy(true);
    try {
      const result = await api("/reports/sign-batch", {
        method: "POST",
        body: JSON.stringify({ reportIds: selected, confirm: true }),
        invalidateCache: ["/reports"],
      });
      setNotice({ type: "success", text: result.message });
      setSelected([]);
      setSignConfirm(false);
      await load(true);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };
  const returnReport = async (reason) => {
    setBusy(true);
    try {
      const result = await api(`/reports/${returning.id}/return`, {
        method: "POST",
        body: JSON.stringify({ reason }),
        invalidateCache: ["/reports"],
      });
      setNotice({ type: "success", text: result.message });
      setReturning(null);
      await load(true);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };
  const actions = (report) =>
    signedOnly ? (
      <button
        className="btn-secondary min-h-9 px-3 py-2"
        onClick={() => setViewing(report)}
      >
        <Eye size={15} /> Lihat
      </button>
    ) : (
      <div className="flex justify-end gap-2">
        <button
          className="btn-secondary min-h-9 px-3 py-2"
          onClick={() => setViewing(report)}
        >
          <Eye size={15} /> Tinjau
        </button>
        <button
          className="btn-secondary min-h-9 px-3 py-2 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => setReturning(report)}
        >
          Revisi
        </button>
      </div>
    );
  return (
    <Page
      title={signedOnly ? "Laporan tervalidasi" : "Validasi laporan"}
      description={
        signedOnly
          ? "Arsip laporan yang sudah Anda setujui dan tandatangani."
          : "Tinjau laporan, pilih beberapa sekaligus, lalu validasi dalam satu tindakan."
      }
      eyebrow={signedOnly ? "Arsip mentor" : "Antrean persetujuan"}
      action={
        !signedOnly && (
          <button
            className="btn-primary"
            disabled={!selected.length || busy}
            onClick={() => setSignConfirm(true)}
          >
            <CheckCircle2 size={17} />
            Tandatangani pilihan{" "}
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">
              {selected.length}
            </span>
          </button>
        )
      }
    >
      <Notice value={notice} clear={() => setNotice(null)} />
      <div className="mb-4 flex flex-col gap-2 sm:max-w-sm">
        <label className="label" htmlFor="intern-filter">
          Peserta magang
        </label>
        <select
          id="intern-filter"
          className="field"
          value={internId}
          onChange={(event) => {
            setInternId(event.target.value);
            setSelected([]);
          }}
        >
          <option value="">Semua peserta ({interns.length})</option>
          {interns.map((intern) => (
            <option key={intern.id} value={intern.id}>
              {intern.name}
            </option>
          ))}
        </select>
      </div>
      {!signedOnly && selected.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-blue-900">
            <b>{selected.length} laporan</b> dipilih dengan total{" "}
            <b>{selectedActivities} kegiatan</b>.
          </p>
          <button
            className="text-xs font-bold text-blue-700 hover:text-blue-900"
            onClick={() => setSelected([])}
          >
            Batalkan pilihan
          </button>
        </div>
      )}
      <ReportTable
        reports={visibleReports}
        loading={loading}
        showIntern
        actions={actions}
        selected={selected}
        onSelect={signedOnly ? undefined : toggle}
        onSelectAll={signedOnly ? undefined : toggleAll}
      />
      <ReportDetailModal report={viewing} onClose={() => setViewing(null)} />
      <ConfirmModal
        config={
          signConfirm
            ? {
                title: "Tandatangani laporan terpilih?",
                description: `${selected.length} laporan dengan total ${selectedActivities} kegiatan akan disetujui menggunakan spesimen tanda tangan aktif.`,
                confirmLabel: "Ya, tandatangani",
                onConfirm: sign,
              }
            : null
        }
        busy={busy}
        onClose={() => setSignConfirm(false)}
      />
      <ReturnModal
        report={returning}
        busy={busy}
        onClose={() => setReturning(null)}
        onSubmit={returnReport}
      />
    </Page>
  );
}
