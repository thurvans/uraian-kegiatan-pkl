import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Activity, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, UserRound } from "../components/icons.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Page } from "../layouts/AppLayout.jsx";
import { ReportTable } from "../components/reports/ReportComponents.jsx";

function Metric({ label, value, icon: Icon, emphasis = false }) {
  return <div className={`relative min-w-0 px-4 py-5 sm:px-5 ${emphasis ? 'bg-[#173942] text-white' : 'bg-white text-[#15282e]'}`}>
    <div className="flex items-start justify-between gap-3"><p className={`text-xs font-medium leading-5 ${emphasis ? 'text-[#b9d0d4]' : 'text-[#627278]'}`}>{label}</p><Icon size={16} className={emphasis ? 'text-[#8ec4ca]' : 'text-[#6c898f]'}/></div>
    <p className="mt-5 text-3xl font-semibold tabular-nums tracking-[-.045em]">{value}</p>
  </div>;
}

export default function DashboardPage({ role }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placement, setPlacement] = useState(null);
  useEffect(() => {
    setLoading(true);
    api("/reports").then(result => setReports(result?.data || [])).catch(() => {}).finally(() => setLoading(false));
    if (role === "MAGANG") api("/placements/me").then(result => setPlacement(result.data)).catch(() => {});
  }, [role]);
  const count = value => reports.filter(report => report.status === value).length;
  const isIntern = role === "MAGANG";
  const activityTotal = reports.reduce((total, report) => total + report.activities.length, 0);
  const firstName = user.name.split(' ')[0];
  return <Page
    title={`Selamat datang, ${firstName}`}
    description={isIntern ? "Lihat progres pencatatan dan status laporan PKL Anda dalam satu alur kerja." : "Tinjau pekerjaan peserta, prioritaskan laporan tertunda, dan selesaikan validasi."}
    action={<NavLink to={isIntern ? '/magang/kegiatan' : '/mentor/validasi'} className="btn-primary">{isIntern ? 'Catat kegiatan' : 'Buka antrean'}<ChevronRight size={14}/></NavLink>}
  >
    <section aria-label="Statistik laporan" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#d5dfdb] bg-[#d5dfdb] xl:grid-cols-4">
      <Metric label="Total laporan mingguan" value={reports.length} icon={CalendarDays}/>
      <Metric label="Menunggu validasi" value={count("SUBMITTED")} icon={ClipboardCheck} emphasis={count("SUBMITTED") > 0}/>
      <Metric label="Sudah ditandatangani" value={count("SIGNED")} icon={CheckCircle2}/>
      <Metric label={isIntern ? "Kegiatan tercatat" : "Perlu dikembalikan"} value={isIntern ? activityTotal : count("RETURNED")} icon={Activity}/>
    </section>

    <div className={`mt-8 grid gap-8 ${placement ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
      <section className="min-w-0">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="section-title">Laporan terbaru</h2><p className="mt-1 text-xs text-[#627278]">Lima periode terakhir, diurutkan dari yang terbaru.</p></div><NavLink to={isIntern ? "/magang/laporan" : "/mentor/laporan"} className="inline-flex items-center gap-1 text-sm font-semibold text-[#176b78] hover:text-[#115863]">Lihat semua <ChevronRight size={12}/></NavLink></div>
        <ReportTable reports={reports.slice(0, 5)} loading={loading} className="dashboard-table"/>
      </section>

      {placement && <aside className="self-start border-t-4 border-[#176b78] bg-white p-6 shadow-[0_1px_2px_rgba(21,40,46,.04)]">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#15282e]">Penempatan aktif</h2><Building2 size={17} className="text-[#176b78]"/></div>
        <p className="mt-6 text-xl font-semibold leading-snug tracking-[-.025em] text-[#15282e]">{placement.officeName}</p>
        <dl className="mt-6 divide-y divide-[#e4e9e6] border-y border-[#e4e9e6] text-sm">
          <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-[#718086]">Unit</dt><dd className="font-medium text-[#31474d]">{placement.division}</dd></div>
          <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-[#718086]">Peran</dt><dd className="font-medium text-[#31474d]"><span className="inline-flex items-start gap-2"><BriefcaseBusiness size={13} className="mt-1 shrink-0 text-[#809397]"/>{placement.position}</span></dd></div>
          <div className="grid grid-cols-[90px_1fr] gap-3 py-3"><dt className="text-[#718086]">Mentor</dt><dd className="font-medium text-[#31474d]"><span className="inline-flex items-start gap-2"><UserRound size={13} className="mt-1 shrink-0 text-[#809397]"/>{placement.mentor?.name || 'Mentor Pembimbing'}</span></dd></div>
        </dl>
        <NavLink to="/magang/penempatan" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#176b78] hover:text-[#115863]">Periksa detail penempatan <ChevronRight size={12}/></NavLink>
      </aside>}
    </div>
  </Page>;
}
