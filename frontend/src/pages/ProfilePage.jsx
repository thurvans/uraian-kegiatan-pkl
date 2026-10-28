import { useState } from 'react';
import { PenLine, Save, X } from '../components/icons.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Notice } from '../components/Feedback.jsx';
import { Page } from '../layouts/AppLayout.jsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const roleLabel = user.role === 'MAGANG' ? 'Peserta magang' : 'Mentor';

  const cancelEdit = () => {
    setName(user.name);
    setEditing(false);
  };
  const saveName = async event => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setNotice({ type: 'error', text: 'Nama minimal terdiri dari 2 karakter.' });
      return;
    }
    if (cleanName === user.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await api('/auth/me', { method: 'PATCH', body: JSON.stringify({ name: cleanName }) });
      updateUser(result.data);
      setName(result.data.name);
      setEditing(false);
      setNotice({ type: 'success', text: result.message || 'Nama profil berhasil diperbarui.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return <Page title="Profil akun" description="Kelola identitas yang tampil pada ruang kerja dan laporan Anda." eyebrow="Pengaturan akun">
    <Notice value={notice} clear={() => setNotice(null)}/>
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
      <section className="card overflow-hidden p-0">
        <div className="relative min-h-40 overflow-hidden bg-navy-950 px-6 py-7 text-white sm:px-8">
          <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10"/>
          <div className="absolute -right-2 -top-10 h-36 w-36 rounded-full border border-blue-300/15"/>
          <div className="absolute bottom-0 right-28 h-px w-40 bg-gradient-to-r from-transparent via-blue-300/30 to-transparent"/>
          <div className="relative flex items-start justify-between gap-5">
            <div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Identitas pengguna</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Informasi pribadi</h2>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-xl font-bold shadow-lg shadow-black/10 backdrop-blur-sm sm:h-16 sm:w-16 sm:text-2xl">{user.name[0]?.toUpperCase()}</div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <form onSubmit={saveName}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <label htmlFor="profile-name" className="label">Nama lengkap</label>
                {editing ? <div className="max-w-lg">
                  <input id="profile-name" className="field" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} autoFocus required aria-describedby="profile-name-hint"/>
                  <p id="profile-name-hint" className="hint">Nama ini akan tampil pada navigasi dan dokumen terkait.</p>
                </div> : <div>
                  <p className="truncate text-lg font-bold text-slate-950">{user.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Nama yang digunakan di seluruh ruang kerja.</p>
                </div>}
              </div>
              {editing ? <div className="flex shrink-0 gap-2">
                <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={busy}><X size={16}/> Batal</button>
                <button className="btn-primary" disabled={busy || name.trim().length < 2}><Save size={16}/>{busy ? 'Menyimpan…' : 'Simpan'}</button>
              </div> : <button type="button" className="btn-secondary shrink-0" onClick={() => { setEditing(true); setNotice(null); }}><PenLine size={16}/> Edit nama</button>}
            </div>
          </form>

          <div className="my-7 h-px bg-slate-100"/>
          <div className="grid gap-6 sm:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Alamat email</p><p className="mt-2 break-all text-sm font-semibold text-slate-800">{user.email}</p><p className="mt-1 text-xs text-slate-500">Email tidak dapat diubah dari halaman ini.</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Peran akun</p><p className="mt-2 text-sm font-semibold text-slate-800">{roleLabel}</p><p className="mt-1 text-xs text-slate-500">Hak akses mengikuti peran yang ditetapkan.</p></div>
          </div>
        </div>
      </section>
    </div>
  </Page>;
}

