import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Lock } from "../icons.jsx";
import { ModalFrame } from "../Modal.jsx";
import { fmtDate, fmtTimeRange } from "../../utils/formatters.js";

function PreviewReport({ report }) {
  const activities = report.activities || [];

  return (
    <section className="relative overflow-hidden bg-white px-5 py-7 sm:px-8" aria-labelledby={`preview-week-${report.id}`}>
      {report.status !== "SIGNED" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden="true">
          <span className="-rotate-12 whitespace-nowrap text-3xl font-bold tracking-[.18em] text-slate-900/[.045] sm:text-5xl">
            PREVIEW · BELUM DIVALIDASI
          </span>
        </div>
      )}
      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-4 text-xs font-bold text-black">
          <h3 id={`preview-week-${report.id}`}>MINGGU KE : {report.weekIndex}</h3>
          <p>BULAN KE : {report.monthIndex}</p>
        </div>
        <div className="overflow-x-auto border border-black">
          <table className="w-full min-w-[680px] table-fixed text-[11px] text-black">
            <caption className="sr-only">Preview laporan minggu {report.weekIndex}</caption>
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
              <col className="w-[42%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead className="!bg-[#e7e6e6] !text-black">
              <tr className="divide-x divide-black">
                <th className="px-2 py-3 text-center">NO</th>
                <th className="px-2 py-3 text-center">HARI / TANGGAL</th>
                <th className="px-2 py-3 text-center">WAKTU</th>
                <th className="px-2 py-3 text-center">JENIS KEGIATAN</th>
                <th className="px-2 py-3 text-center">TANDA TANGAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {activities.length ? activities.map((activity, index) => (
                <tr key={activity.id} className="divide-x divide-black hover:!bg-white">
                  <td className="px-2 py-4 text-center align-middle">{index + 1}</td>
                  <td className="px-2 py-4 text-center align-middle capitalize">{fmtDate(activity.activityDate)}</td>
                  <td className="px-2 py-4 text-center align-middle">{fmtTimeRange(activity.startTime, activity.endTime)}</td>
                  <td className="whitespace-pre-line px-3 py-4 align-top leading-5">{activity.description}</td>
                  <td className="px-2 py-4 text-center align-middle text-[10px] text-slate-500">
                    {report.status === "SIGNED" ? "Telah divalidasi" : "Menunggu validasi"}
                  </td>
                </tr>
              )) : (
                <tr className="hover:!bg-white">
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">Belum ada kegiatan pada minggu ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function PeriodPreviewModal({ open, reports, onClose }) {
  const [printBlocked, setPrintBlocked] = useState(false);
  const sortedReports = useMemo(
    () => [...(reports || [])].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart)),
    [reports],
  );
  const placement = sortedReports[0]?.placement;

  useEffect(() => {
    if (!open) return undefined;
    setPrintBlocked(false);
    document.body.classList.add("preview-print-protected");
    const blockPrintShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setPrintBlocked(true);
      }
    };
    window.addEventListener("keydown", blockPrintShortcut, true);
    return () => {
      window.removeEventListener("keydown", blockPrintShortcut, true);
      document.body.classList.remove("preview-print-protected");
    };
  }, [open]);

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Preview seluruh periode"
      description="Pratinjau ini hanya untuk pemeriksaan dan tidak dapat diunduh atau dicetak."
      maxWidth="max-w-6xl"
    >
      <div className="report-preview-protected bg-[#e8ecea] p-3 sm:p-5">
        {printBlocked && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert" aria-live="assertive">
            <AlertTriangle size={16} /> Pencetakan dinonaktifkan untuk preview laporan yang belum final.
          </div>
        )}
        <div className="mx-auto aspect-[210/297] w-full max-w-[794px] divide-y divide-dashed divide-slate-300 bg-white font-['Times_New_Roman',Times,serif] shadow-sm">
          {placement && (
            <header className="px-5 py-8 text-center text-black sm:px-8">
              <p className="text-base font-bold sm:text-lg">URAIAN KEGIATAN PRAKTIK KERJA LAPANGAN</p>
              <p className="mt-1 text-base font-bold sm:text-lg">{placement.officeName?.toUpperCase()}</p>
              <p className="text-base font-bold sm:text-lg">{placement.region?.toUpperCase()}</p>
              <p className="mt-1 text-sm font-bold">BAGIAN {placement.division?.toUpperCase()}</p>
              <p className="mt-3 text-sm font-bold">BERTUGAS SEBAGAI : {placement.position?.toUpperCase()}</p>
              <p className="mt-1 text-sm font-bold">PERIODE : {fmtDate(placement.startDate)} S/D {fmtDate(placement.endDate)}</p>
            </header>
          )}
          {sortedReports.map((report) => <PreviewReport key={report.id} report={report} />)}
          {!sortedReports.length && <p className="px-6 py-14 text-center text-sm text-slate-500">Belum ada laporan untuk ditampilkan.</p>}
        </div>
      </div>
      <div className="flex justify-end border-t border-[#e4e9e6] px-6 py-4">
        <button className="btn-secondary" onClick={onClose}>Tutup preview</button>
      </div>
    </ModalFrame>
  );
}
