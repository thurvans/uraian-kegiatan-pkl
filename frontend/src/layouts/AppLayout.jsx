import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, BriefcaseBusiness, ChevronRight, ClipboardCheck, FileText, LayoutDashboard, LogOut, Menu, PenLine, UserRound, X } from '../components/icons.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { prefetchApi } from '../api.js';

function Shell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const intern = [
    { to: '/magang/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { to: '/magang/penempatan', label: 'Penempatan', icon: BriefcaseBusiness },
    { to: '/magang/kegiatan', label: 'Kegiatan', icon: Activity },
    { to: '/magang/laporan', label: 'Laporan', icon: FileText }
  ];
  const mentor = [
    { to: '/mentor/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { to: '/mentor/validasi', label: 'Validasi', icon: ClipboardCheck },
    { to: '/mentor/tanda-tangan', label: 'Tanda tangan', icon: PenLine },
    { to: '/mentor/laporan', label: 'Arsip laporan', icon: FileText }
  ];
  const links = [...(user.role === 'MAGANG' ? intern : mentor), { to: '/profil', label: 'Profil', icon: UserRound }];
  const roleLabel = user.role === 'MAGANG' ? 'Peserta magang' : 'Mentor pembimbing';
  const warmRoute = to => {
    const queries = { '/magang/kegiatan': ['/activities'], '/magang/laporan': ['/reports'], '/mentor/validasi': ['/reports?status=SUBMITTED'], '/mentor/laporan': ['/reports?status=SIGNED'] };
    queries[to]?.forEach(path => void prefetchApi(path));
  };
  return <div className="min-h-screen bg-[#f3f5f3]">
    <a href="#main-content" className="fixed left-4 top-3 z-[60] -translate-y-20 rounded-md bg-[#173942] px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0">Lewati ke konten utama</a>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce3df] bg-white px-4 lg:hidden">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-[#dce3df] bg-white"><BrandLogo className="h-full w-full"/></span><div><b className="block text-sm tracking-tight text-[#15282e]">Uraian PKL</b><span className="block text-[11px] text-[#627278]">{roleLabel}</span></div></div>
      <button className="icon-btn border-0" onClick={() => setMobileOpen(true)} aria-label="Buka navigasi" aria-expanded={mobileOpen}><Menu size={19}/></button>
    </header>
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#dce3df] bg-[#fbfcfb] transition-[width,transform] duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarOpen ? 'lg:w-72' : 'lg:w-[76px]'}`}>
      <div className={`flex h-24 items-center gap-3 border-b border-[#e4e9e6] px-5 ${sidebarOpen ? '' : 'lg:justify-center lg:px-2'}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#dce3df] bg-white"><BrandLogo className="h-full w-full"/></span>
        <div className={`min-w-0 flex-1 ${sidebarOpen ? '' : 'lg:hidden'}`}><p className="truncate font-semibold tracking-[-.015em] text-[#15282e]">Uraian Kegiatan PKL</p><p className="mt-0.5 text-[11px] text-[#718086]">Ruang kerja pelaporan</p></div>
        <button type="button" onClick={() => setMobileOpen(false)} className="icon-btn h-9 w-9 shrink-0 lg:!hidden" aria-label="Tutup navigasi"><X size={17}/></button>
      </div>
      <div className={`flex-1 px-4 py-6 ${sidebarOpen ? '' : 'lg:px-3'}`}>
        <p className={`mb-3 px-3 text-[11px] font-semibold text-[#87948f] ${sidebarOpen ? '' : 'lg:hidden'}`}>Navigasi</p>
        <nav className="space-y-1" aria-label="Navigasi utama">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} title={sidebarOpen ? undefined : label} onMouseEnter={() => warmRoute(to)} onFocus={() => warmRoute(to)} onTouchStart={() => warmRoute(to)} className={({ isActive }) => `group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${sidebarOpen ? '' : 'lg:justify-center lg:px-0'} ${isActive ? 'bg-[#e7f2f2] text-[#115863]' : 'text-[#57696e] hover:bg-[#eef2ef] hover:text-[#15282e]'}`}><Icon size={17}/><span className={`flex-1 ${sidebarOpen ? '' : 'lg:hidden'}`}>{label}</span><ChevronRight size={12} className={`opacity-0 transition group-hover:opacity-50 ${sidebarOpen ? '' : 'lg:hidden'}`}/></NavLink>)}</nav>
      </div>
      <div className="border-t border-[#e4e9e6] p-4"><div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'lg:justify-center'}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#173942] text-sm font-semibold text-white">{user.name[0].toUpperCase()}</div><div className={`min-w-0 flex-1 ${sidebarOpen ? '' : 'lg:hidden'}`}><p className="truncate text-sm font-semibold text-[#20343a]">{user.name}</p><p className="truncate text-[11px] text-[#718086]">{roleLabel}</p></div><button onClick={logout} className={`icon-btn h-9 w-9 shrink-0 ${sidebarOpen ? '' : 'lg:!hidden'}`} title="Keluar" aria-label="Keluar dari akun"><LogOut size={15}/></button></div></div>
      <button type="button" onClick={() => setSidebarOpen(current => !current)} className="absolute -right-3 top-28 hidden h-7 w-7 place-items-center rounded-full border border-[#cfd9d4] bg-white text-[#617278] shadow-sm transition hover:text-[#15282e] lg:grid" aria-label={sidebarOpen ? 'Ciutkan navigasi' : 'Perluas navigasi'} aria-expanded={sidebarOpen}><ChevronRight size={11} className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`}/></button>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-30 bg-[#102a33]/45 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi"/>}
    <main id="main-content" tabIndex="-1" className={`min-h-screen px-4 py-7 transition-[margin] duration-300 sm:px-7 lg:px-10 lg:py-10 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-[76px]'}`}><div className="mx-auto max-w-[1360px] page-enter" key={location.pathname}>{children}</div></main>
  </div>;
}

export function Page({ title, description, action, children }) {
  return <><header className="mb-8 border-b border-[#dce3df] pb-6 sm:flex sm:items-end sm:justify-between sm:gap-8"><div className="max-w-3xl"><h1 className="text-balance text-[1.75rem] font-semibold leading-tight tracking-[-.035em] text-[#15282e] sm:text-[2.125rem]">{title}</h1><p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[#627278]">{description}</p></div>{action && <div className="mt-5 shrink-0 sm:mt-0">{action}</div>}</header>{children}</>;
}

export function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace/>;
  if (role && user.role !== role) return <Navigate to={user.role === 'MAGANG' ? '/magang/dashboard' : '/mentor/dashboard'} replace/>;
  return <Shell>{children || <Outlet/>}</Shell>;
}
