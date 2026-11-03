import { useState } from "react";
import { Pencil, Save, X } from "../components/icons.jsx";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Notice } from "../components/Feedback.jsx";
import { Page } from "../layouts/AppLayout.jsx";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const roleLabel = user.role === "MAGANG" ? "Peserta magang" : "Mentor";

  const cancelEdit = () => {
    setName(user.name);
    setEditing(false);
  };
  const saveName = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setNotice({
        type: "error",
        text: "Nama minimal terdiri dari 2 karakter.",
      });
      return;
    }
    if (cleanName === user.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName }),
      });
      updateUser(result.data);
      setName(result.data.name);
      setEditing(false);
      setNotice({
        type: "success",
        text: result.message || "Nama profil berhasil diperbarui.",
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Profil akun"
      description="Kelola identitas yang tampil pada ruang kerja dan laporan Anda."
      eyebrow="Pengaturan akun"
    >
      <Notice value={notice} clear={() => setNotice(null)} />
      <div className="max-w-4xl">
        <section className="card overflow-hidden p-0">
          <div className="border-b border-[#dce3df] bg-[#173942] px-6 py-7 text-white sm:px-8">
            <div className="flex items-center justify-between gap-5">
              <div>
                <h2 className="text-xl font-semibold tracking-[-.02em] sm:text-2xl">
                  Informasi pribadi
                </h2>
                <p className="mt-1 text-sm text-[#b9d0d4]">Identitas utama pada laporan dan ruang kerja.</p>
              </div>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white text-xl font-semibold text-[#173942] sm:h-16 sm:w-16 sm:text-2xl">
                {user.name[0]?.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <form onSubmit={saveName}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label htmlFor="profile-name" className="label">
                    Nama lengkap
                  </label>
                  {editing ? (
                    <div className="max-w-lg">
                      <input
                        id="profile-name"
                        name="name"
                        className="field"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        minLength={2}
                        maxLength={80}
                        autoFocus
                        required
                        aria-describedby="profile-name-hint"
                      />
                      <p id="profile-name-hint" className="hint">
                        Nama ini akan tampil pada navigasi dan dokumen terkait.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="truncate text-lg font-semibold text-[#15282e]">
                        {user.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Nama yang digunakan di seluruh ruang kerja.
                      </p>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={cancelEdit}
                      disabled={busy}
                    >
                      <X size={16} /> Batal
                    </button>
                    <button
                      className="btn-primary"
                      disabled={busy || name.trim().length < 2}
                    >
                      <Save size={16} />
                      {busy ? "Menyimpan…" : "Simpan"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary shrink-0"
                    onClick={() => {
                      setEditing(true);
                      setNotice(null);
                    }}
                  >
                    <Pencil size={16} /> Edit nama
                  </button>
                )}
              </div>
            </form>

            <div className="my-7 h-px bg-slate-100" />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-[#718086]">
                  Alamat email
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                  {user.email}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Email tidak dapat diubah dari halaman ini.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#718086]">
                  Peran akun
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {roleLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hak akses mengikuti peran yang ditetapkan.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Page>
  );
}
