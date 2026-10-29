import { useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import {
  Activity, BriefcaseBusiness, ChevronRight, ClipboardCheck, FileText,
  LayoutDashboard, LogOut, Menu, PenLine, UserRound
} from '../components/icons.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { prefetchApi } from '../api.js';

function Shell({ children }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const intern = [
    { to: '/magang/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/magang/penempatan', label: 'Penempatan', icon: BriefcaseBusiness },
    { to: '/magang/kegiatan', label: 'Kegiatan', icon: Activity },
    { to: '/magang/laporan', label: 'Laporan', icon: FileText }
  ];
  const mentor = [
    { to: '/mentor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/mentor/validasi', label: 'Validasi', icon: ClipboardCheck },
    { to: '/mentor/tanda-tangan', label: 'Tanda tangan', icon: PenLine },
    { to: '/mentor/laporan', label: 'Laporan', icon: FileText }
  ];
  const links = [...(user.role === 'MAGANG' ? intern : mentor), { to: '/profil', label: 'Profil', icon: UserRound }];
  const roleLabel = user.role === 'MAGANG' ? 'Peserta magang' : 'Mentor';
  const warmRoute = to => {
    const queries = {
      '/magang/kegiatan': ['/activities'],
      '/magang/laporan': ['/reports'],
      '/mentor/validasi': ['/reports?status=SUBMITTED'],
      '/mentor/laporan': ['/reports?status=SIGNED']
    };
    queries[to]?.forEach(path => void prefetchApi(path));
  };
  return <div className="min-h-screen">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><BrandLogo className="h-full w-full"/></span><div><b className="block text-sm text-navy-950">Uraian PKL</b><span className="block text-[10px] text-slate-400">{roleLabel}</span></div></div>
      <button className="icon-btn border-0 shadow-none" onClick={() => setMobileOpen(current => !current)} aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={mobileOpen}><Menu size={20}/></button>
    </header>

    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden bg-navy-950 text-white shadow-2xl transition-[width,transform] duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'}`}>
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl"/>
      <div className={`relative flex h-20 items-center gap-3 border-b border-white/10 px-5 ${sidebarOpen ? '' : 'lg:justify-center lg:px-2'}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-white/20 ${sidebarOpen ? '' : 'lg:hidden'}`}><BrandLogo className="h-full w-full"/></span>
        <div className={`min-w-0 flex-1 ${sidebarOpen ? '' : 'lg:hidden'}`}><p className="truncate font-bold tracking-tight">Uraian Kegiatan PKL</p><p className="text-[11px] text-slate-400">Pelaporan terintegrasi</p></div>
        <button type="button" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden" title="Tutup sidebar" aria-label="Tutup sidebar"><Menu size={19}/></button>
        <button type="button" onClick={() => setSidebarOpen(current => !current)} className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white lg:grid" title={sidebarOpen ? 'Ciutkan sidebar' : 'Buka sidebar'} aria-label={sidebarOpen ? 'Ciutkan sidebar' : 'Buka sidebar'} aria-expanded={sidebarOpen}><Menu size={19}/></button>
      </div>
      <div className={`relative flex-1 px-4 py-6 ${sidebarOpen ? '' : 'lg:px-3'}`}>
        <p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 ${sidebarOpen ? '' : 'lg:hidden'}`}>Menu utama</p>
        <nav className="space-y-1">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} title={sidebarOpen ? undefined : label} onMouseEnter={() => warmRoute(to)} onFocus={() => warmRoute(to)} onTouchStart={() => warmRoute(to)} onClick={() => setMobileOpen(false)} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${sidebarOpen ? '' : 'lg:justify-center lg:px-0'} ${isActive ? 'bg-white text-navy-950 shadow-lg shadow-black/10' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}><Icon size={18}/><span className={`flex-1 ${sidebarOpen ? '' : 'lg:hidden'}`}>{label}</span><ChevronRight size={14} className={`opacity-0 transition group-hover:opacity-60 ${sidebarOpen ? '' : 'lg:hidden'}`}/></NavLink>)}</nav>
      </div>
      <div className={`relative m-4 rounded-2xl border border-white/10 bg-white/5 p-3.5 ${sidebarOpen ? '' : 'lg:m-3 lg:p-1.5'}`}><div className={`flex items-center gap-3 ${sidebarOpen ? '' : 'lg:justify-center'}`}><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-200 font-bold text-navy-950 ${sidebarOpen ? '' : 'lg:hidden'}`}>{user.name[0].toUpperCase()}</div><div className={`min-w-0 flex-1 ${sidebarOpen ? '' : 'lg:hidden'}`}><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-[11px] text-slate-400">{roleLabel}</p></div><button onClick={logout} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white" title="Keluar" aria-label="Keluar dari akun"><LogOut size={16}/></button></div></div>
    </aside>

    {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi"/>}

    <main className={`min-h-screen px-4 py-6 transition-[margin] duration-300 sm:px-6 lg:px-8 lg:py-8 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}><div className="mx-auto max-w-[1440px]">{children}</div></main>
  </div>;
}

export function Page({ title, description, action, eyebrow, children }) {
  return <><header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-[-.025em] text-slate-950 sm:text-[28px]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</header>{children}</>;
}

export function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace/>;
  if (role && user.role !== role) return <Navigate to={user.role === 'MAGANG' ? '/magang/dashboard' : '/mentor/dashboard'} replace/>;
  return <Shell>{children || <Outlet/>}</Shell>;
}

