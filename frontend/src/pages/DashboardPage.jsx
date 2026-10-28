import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  UserRound,
} from "../components/icons.jsx";
import { api } from "../api.js";
import { Page } from "../layouts/AppLayout.jsx";
import { ReportTable } from "../components/reports/ReportComponents.jsx";

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return (
    <article className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-[-.04em] text-slate-950">
            {value}
          </p>
        </div>
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${tones[tone]}`}
        >
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

export default function DashboardPage({ role }) {
  const [reports, setReports] = useState([]);
  const [placement, setPlacement] = useState(null);
  useEffect(() => {
    api("/reports").then((result) => setReports(result.data));
    if (role === "MAGANG")
      api("/placements/me")
        .then((result) => setPlacement(result.data))
        .catch(() => {});
  }, [role]);
  const count = (value) =>
    reports.filter((report) => report.status === value).length;
  const isIntern = role === "MAGANG";
  const destination = isIntern ? "/magang/kegiatan" : "/mentor/validasi";
  return (
    <Page
      title={`Dashboard ${isIntern ? "magang" : "mentor"}`}
      description={
        isIntern
          ? "Pantau progres PKL dan kelola laporan harian Anda dari satu tempat."
          : "Tinjau laporan peserta dan selesaikan validasi yang masih menunggu."
      }
      eyebrow="Ringkasan hari ini"
    >
      
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total minggu"
          value={reports.length}
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard
          label="Menunggu validasi"
          value={count("SUBMITTED")}
          icon={ClipboardCheck}
          tone="amber"
        />
        <StatCard
          label="Ditandatangani"
          value={count("SIGNED")}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label={isIntern ? "Kegiatan tercatat" : "Perlu revisi"}
          value={
            isIntern
              ? reports.reduce(
                  (total, report) => total + report.activities.length,
                  0,
                )
              : count("RETURNED")
          }
          icon={Activity}
          tone="violet"
        />
      </section>
      {placement && (
        <section className="card mt-6 overflow-hidden p-0">
          <div className="grid lg:grid-cols-[1fr_auto]">
            <div className="p-6">
              <p className="eyebrow">Penempatan aktif</p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                {placement.officeName}
              </h2>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  {placement.division}
                </span>
                <span className="inline-flex items-center gap-2">
                  <BriefcaseBusiness size={16} className="text-blue-600" />
                  {placement.position}
                </span>
                <span className="inline-flex items-center gap-2">
                  <UserRound size={16} className="text-blue-600" />
                  Mentor: {placement.mentor?.name || 'Mentor Pembimbing'}
                </span>
              </div>
            </div>
            <NavLink
              to="/magang/penempatan"
              className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 lg:w-48 lg:border-t-0 lg:border-l"
            >
              Lihat detail
              <ChevronRight size={17} />
            </NavLink>
          </div>
        </section>
      )}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="section-title">Laporan terbaru</h2>
            <p className="mt-1 text-xs text-slate-500">
              Lima laporan terakhir berdasarkan minggu.
            </p>
          </div>
          <NavLink
            to={isIntern ? "/magang/laporan" : "/mentor/laporan"}
            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Lihat semua
          </NavLink>
        </div>
        <ReportTable reports={reports.slice(0, 5)} />
      </section>
    </Page>
  );
}
