# Sistem Uraian Kegiatan PKL

MVP sesuai `PRD_Uraian_Kegiatan_PKL.md`, terdiri dari Express + Prisma/PostgreSQL di `backend` dan React + Vite + Tailwind CSS lokal di `frontend`.

## Menjalankan lokal

Prasyarat: Node.js 22.x, npm, dan PostgreSQL 15+ yang berjalan secara lokal atau melalui penyedia database.

1. Buat database PostgreSQL, lalu pastikan service PostgreSQL aktif dan dapat diakses.
2. Salin `backend/.env.example` menjadi `backend/.env`. Sesuaikan `DATABASE_URL` dan ganti
   `JWT_SIGNING_SECRET` dengan string acak minimal 32 karakter.
3. Salin `frontend/.env.example` menjadi `frontend/.env`. Vite akan meneruskan `/api` ke backend lokal.
4. Instal dependency deterministik dari lockfile: `npm run install:all`.
5. Terapkan migrasi database: `npx prisma migrate deploy --schema backend/prisma/schema.prisma`.
6. Isi akun demo: `npm run prisma:seed --prefix backend`.
7. Jalankan dua terminal:
   - `npm run dev --prefix backend`
   - `npm run dev --prefix frontend`

Frontend tersedia di `http://localhost:5173`, API di `http://localhost:4000/api/v1`.

## Akun hasil seed

- Magang: `magang@pkl.local` / `Password123!`
- Magang kedua: `magang2@pkl.local` / `Password123!`
- Mentor: `mentor@pkl.local` / `Password123!`

Ganti kredensial seed untuk lingkungan non-demo.

Seed demo otomatis ditolak ketika `NODE_ENV=production`.

## Deployment ke Vercel (dua project)

Repository ini dideploy sebagai dua Vercel Project dari repository Git yang sama. Konfigurasi berada di
folder aplikasi masing-masing, bukan di root repository.

1. Import repository sebagai project backend dan pilih **Root Directory** `backend`. Jangan isi Build
   Command atau Output Directory; preset Express mendeteksi `src/app.js` secara otomatis.
2. Isi environment backend dari `backend/.env.production.example`. Gunakan URL HTTPS frontend yang
   sebenarnya untuk `FRONTEND_URL`, database PostgreSQL eksternal untuk `DATABASE_URL`, dan secret acak
   minimal 32 karakter untuk `JWT_SIGNING_SECRET`.
3. Jalankan migrasi terhadap database production dari CI atau mesin administrasi sebelum backend menerima
   trafik: `npx prisma migrate deploy --schema backend/prisma/schema.prisma`.
4. Import repository sekali lagi sebagai project frontend dan pilih **Root Directory** `frontend`. Isi
   `VITE_API_URL` dengan URL backend ditambah `/api/v1`, lalu deploy menggunakan preset Vite.
5. Jika frontend dan backend berada pada site/domain yang berbeda, gunakan `COOKIE_SAME_SITE=none`. Jika
   keduanya memakai subdomain dari domain registrable yang sama, `lax` dapat digunakan.

`frontend/vercel.json` menangani deep link React Router, sedangkan `backend/vercel.json` memilih preset
Express. Node.js dipatok ke 22.x pada `package.json` masing-masing aplikasi.

> **Batasan penyimpanan tanda tangan:** filesystem Vercel Function bersifat read-only kecuali `/tmp`, dan
> isi `/tmp` tidak persisten. Nilai `/tmp/signatures` pada contoh hanya membuat request tulis dapat berjalan;
> tanda tangan tetap harus dipindahkan ke object storage persisten (misalnya Vercel Blob atau S3) sebelum
> fitur tanda tangan dianggap siap production di Vercel.

### Bootstrap akun production pertama

Jangan menjalankan seed demo. Pada database kosong, siapkan `DATABASE_URL` production dan seluruh variabel
`BOOTSTRAP_*` berikut pada shell atau CI yang aman, lalu jalankan `npm run prisma:bootstrap --prefix backend`:

- `BOOTSTRAP_MENTOR_NAME`, `BOOTSTRAP_MENTOR_EMAIL`, dan `BOOTSTRAP_MENTOR_PASSWORD`.
- `BOOTSTRAP_INTERN_NAME`, `BOOTSTRAP_INTERN_EMAIL`, dan `BOOTSTRAP_INTERN_PASSWORD`.
- `BOOTSTRAP_OFFICE_NAME`, `BOOTSTRAP_REGION`, `BOOTSTRAP_DIVISION`, dan `BOOTSTRAP_POSITION`.
- `BOOTSTRAP_START_DATE` dan `BOOTSTRAP_END_DATE` dalam format `YYYY-MM-DD`.

Password bootstrap minimal 12 karakter dan tidak pernah dicetak ke log.

Bootstrap menolak berjalan apabila database sudah memiliki pengguna, sehingga tidak dapat mereset akun
yang sudah ada secara tidak sengaja.

## Alur utama

1. Magang melengkapi penempatan, mencatat kegiatan Senin–Jumat, lalu mengajukan laporan.
2. Mentor menggambar dan menyimpan spesimen tanda tangan privat.
3. Mentor memilih satu atau beberapa laporan `SUBMITTED` dan menandatanganinya secara atomik.
4. Laporan `SIGNED` dapat diekspor per minggu atau seluruh periode. Minggu dan tanggal kosong tidak dicetak.

## Keamanan dan penyimpanan

- Access JWT disimpan dalam memori browser; refresh token di cookie HttpOnly dan hash sesi disimpan di PostgreSQL.
- File PNG tanda tangan disimpan di `backend/storage/private/signatures`, bukan direktori publik.
- Pada Vercel, file tanda tangan harus menggunakan object storage persisten sebelum aplikasi dipakai di production.
- `/api/v1/health/live` memeriksa proses API dan `/api/v1/health/ready` juga memeriksa koneksi database.

## Pemeriksaan

- Unit test kalender: `npm test --prefix backend`
- Build frontend: `npm run build --prefix frontend`
- Validasi Prisma: `npm run prisma:validate --prefix backend`
- Seluruh pemeriksaan: `npm run check`

## Struktur kode

- `backend/src/routes`: boundary HTTP dan otorisasi per fitur.
- `backend/src/services`: logika aplikasi yang dipakai lintas route.
- `backend/src/lib`: utilitas infrastruktur dan fungsi murni.
- `frontend/src/auth`: lifecycle sesi dan state autentikasi.
- `frontend/src/layouts`: shell aplikasi, layout halaman, dan route guard.
- `frontend/src/pages`: satu file terpisah untuk setiap halaman aplikasi.
- `frontend/src/components`: komponen UI yang dapat digunakan ulang.
- `frontend/src/components/reports`: tabel, empty state, dan detail laporan bersama.
- `frontend/src/utils`: formatter dan fungsi murni tanpa state React.

Konfigurasi backend divalidasi saat proses dimulai. Atur `TRUST_PROXY` sesuai jumlah proxy tepercaya dan
jangan gunakan nilai lebih luas dari topologi deployment aktual.
