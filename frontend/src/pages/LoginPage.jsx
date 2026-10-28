import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Envelope,
  Eye,
  EyeOff,
  Lock,
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.15fr_.85fr]">
      <section className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between">
        <img
          src="/login-desk.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-navy-950/40" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-white/20">
            <BrandLogo className="h-full w-full" />
          </span>
          <div>
            <p className="font-bold">Uraian Kegiatan PKL</p>
            <p className="text-xs text-slate-300">
              Pelaporan kegiatan terintegrasi
            </p>
          </div>
        </div>
        <div className="relative max-w-2xl">
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.12] tracking-[-.035em] drop-shadow-sm xl:text-6xl">
            Catat kegiatan.
            <br />
            Pantau progres.
            <br />
            Selesaikan laporan.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-200">
            Catat kegiatan harian, susun laporan mingguan, dapatkan validasi
            mentor, lalu unduh dokumen siap cetak.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-slate-300">
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
          <p className="eyebrow">Selamat datang kembali</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-.025em] text-navy-900">
            Masuk untuk mengelola kegiatan dan laporan PKL.
          </h2>
          <form onSubmit={submit} className="mt-8 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            <label className="block">
              <span className="label">Alamat email</span>
              <span className="relative block">
                <Envelope
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-email"
                  className="field py-3! pl-10!"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  required
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </span>
            </label>
            <label className="block">
              <span className="label">Kata sandi</span>
              <span className="relative block">
                <Lock
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="login-password"
                  className="field py-3! pl-10! pr-11!"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                />
                <button
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-navy-900"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <button
              id="login-submit"
              className="btn-primary min-h-12! w-full text-base!"
              disabled={busy}
            >
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
