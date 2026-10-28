import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "../components/icons.jsx";
import { BrandLogo } from "../components/BrandLogo.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user)
    return (
      <Navigate
        to={user.role === "MAGANG" ? "/magang/dashboard" : "/mentor/dashboard"}
        replace
      />
    );
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const current = await login(form);
      navigate(
        current.role === "MENTOR" ? "/mentor/dashboard" : "/magang/dashboard",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-white/20">
            <BrandLogo className="h-full w-full" />
          </span>
          <div>
            <p className="font-bold">Uraian Kegiatan PKL</p>
            <p className="text-xs text-slate-400">
              Pelaporan kegiatan terintegrasi
            </p>
          </div>
        </div>
        <div className="relative max-w-2xl">
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.12] tracking-[-.035em]">
            Kelola Kegiatan PKL dengan Lebih Mudah dan Terstruktur.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Catat kegiatan harian, susun laporan mingguan, dapatkan validasi
            mentor, lalu unduh dokumen siap cetak.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={15} /> Data dan tanda tangan hanya dapat diakses
          pengguna berwenang.
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-slate-50/70 p-5 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <BrandLogo className="h-full w-full" />
            </span>
            <b className="text-lg text-navy-900">Uraian PKL</b>
          </div>
          <p className="eyebrow">Selamat datang</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.025em] text-slate-950">
            Masuk ke ruang kerja
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Gunakan akun yang telah disediakan untuk melanjutkan.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            <label>
              <span className="label">Alamat email</span>
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <label>
              <span className="label">Password</span>
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </label>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? (
                "Memproses…"
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
