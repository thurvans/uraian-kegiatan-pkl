import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Envelope, Eye, EyeOff, Lock, ShieldCheck } from "../components/icons.jsx";
import { BrandLogo } from "../components/BrandLogo.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to={user.role === "MAGANG" ? "/magang/dashboard" : "/mentor/dashboard"} replace/>;
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError("");
    try { const current = await login(form); navigate(current.role === "MENTOR" ? "/mentor/dashboard" : "/magang/dashboard"); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(440px,.82fr)_minmax(560px,1.18fr)]">
    <section className="flex min-h-screen items-center justify-center bg-[#f3f5f3] px-5 py-10 sm:px-10 lg:px-14">
      <div className="w-full max-w-[430px]">
        <div className="mb-14 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg border border-[#d8e1dd] bg-white"><BrandLogo className="h-full w-full"/></span><div><p className="font-semibold tracking-[-.015em] text-[#15282e]">Uraian Kegiatan PKL</p><p className="text-xs text-[#718086]">Ruang kerja pelaporan</p></div></div>
        <h1 className="max-w-sm text-[2rem] font-semibold leading-[1.15] tracking-[-.04em] text-[#15282e] sm:text-[2.5rem]">Masuk ke ruang kerja Anda.</h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-[#627278]">Kelola kegiatan harian, laporan mingguan, dan proses validasi dalam satu tempat.</p>
        <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
          {error && <div className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert"><AlertTriangle size={16} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
          <label className="block" htmlFor="login-email"><span className="label">Alamat email</span><span className="relative block"><Envelope size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#849399]"/><input id="login-email" name="email" className="field py-3! pl-10!" type="email" autoComplete="email" spellCheck="false" placeholder="nama@email.com" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></span></label>
          <label className="block" htmlFor="login-password"><span className="label">Kata sandi</span><span className="relative block"><Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#849399]"/><input id="login-password" name="password" className="field py-3! pl-10! pr-11!" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan kata sandi" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/><button id="toggle-password" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#627278] transition hover:bg-[#eef2ef] hover:text-[#15282e]">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>
          <button id="login-submit" className="btn-primary min-h-12! w-full justify-between! px-5! text-base!" disabled={busy}><span>{busy ? "Memproses…" : "Masuk"}</span><ArrowRight size={16}/></button>
        </form>
        <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-[#718086]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#176b78]"/>Data akun dan tanda tangan hanya dapat diakses pengguna berwenang.</p>
      </div>
    </section>
    <section className="relative hidden min-h-screen overflow-hidden bg-[#173942] lg:block" aria-label="Tentang aplikasi">
      <img src="/login-desk.jpg" alt="Meja kerja untuk menyusun laporan kegiatan" width="1024" height="1024" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover grayscale-[18%]"/>
      <div className="absolute inset-0 bg-[#102a33]/72"/>
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#102a33] to-transparent"/>
      <div className="relative flex h-full min-h-screen flex-col justify-end p-12 xl:p-16">
        <div className="max-w-2xl border-l border-white/30 pl-7">
          <p className="text-4xl font-medium leading-[1.18] tracking-[-.035em] text-white xl:text-5xl">Catatan kerja yang rapi.<br/>Progres yang mudah ditinjau.</p>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#d3e1e2]">Dari kegiatan harian hingga dokumen siap cetak, setiap langkah tetap tertata dan dapat ditelusuri.</p>
        </div>
      </div>
    </section>
  </main>;
}
