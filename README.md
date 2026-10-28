# Sistem Uraian Kegiatan PKL

MVP sesuai `PRD_Uraian_Kegiatan_PKL.md`, terdiri dari Express + Prisma/PostgreSQL di `backend` dan React + Vite + Tailwind CSS lokal di `frontend`.

## Menjalankan lokal

Prasyarat: Node.js 20+, npm, PostgreSQL 15+ (atau Docker).

1. Jalankan PostgreSQL: `docker compose up -d postgres`.
2. Salin `backend/.env.example` menjadi `backend/.env` dan ganti `JWT_SIGNING_SECRET` dengan string acak minimal 32 karakter.
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

## Deployment production dengan Docker Compose

Prasyarat server: Docker Engine, Docker Compose v2, sebuah domain, dan reverse proxy TLS
(misalnya Caddy atau Nginx) pada host.

1. Salin `.env.production.example` menjadi `.env.production`.
2. Ganti seluruh placeholder. Gunakan secret JWT acak minimal 32 karakter dan password database yang panjang.
3. Pastikan `FRONTEND_URL` sama persis dengan URL HTTPS publik, tanpa slash di akhir.
4. Validasi konfigurasi tanpa menjalankan service:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
   ```

5. Build dan jalankan database, migrasi, API, serta frontend:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   docker compose --env-file .env.production -f docker-compose.prod.yml ps
   ```

6. Arahkan reverse proxy TLS ke `127.0.0.1:8080`. Contoh Caddy:

   ```caddyfile
   pkl.example.com {
       reverse_proxy 127.0.0.1:8080
   }
   ```

   Port aplikasi hanya di-bind ke loopback; jangan dibuka langsung ke internet tanpa HTTPS.

7. Periksa readiness melalui URL publik:

   ```sh
   curl --fail https://pkl.example.com/api/v1/health/ready
   ```

Migrasi dijalankan oleh service `migrate` sebelum backend dimulai. Frontend menggunakan API same-origin
`/api/v1`, sehingga refresh cookie tidak bergantung pada third-party cookie.

### Bootstrap akun production pertama

Jangan menjalankan seed demo. Pada database kosong, jalankan bootstrap satu kali dengan seluruh variabel
`BOOTSTRAP_*` di bawah. Password minimal 12 karakter dan tidak pernah dicetak ke log.

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm \
  -e BOOTSTRAP_MENTOR_NAME='Nama Mentor' \
  -e BOOTSTRAP_MENTOR_EMAIL='mentor@example.com' \
  -e BOOTSTRAP_MENTOR_PASSWORD='ganti-password-kuat' \
  -e BOOTSTRAP_INTERN_NAME='Nama Peserta' \
  -e BOOTSTRAP_INTERN_EMAIL='peserta@example.com' \
  -e BOOTSTRAP_INTERN_PASSWORD='ganti-password-kuat' \
  -e BOOTSTRAP_OFFICE_NAME='Nama Kantor' \
  -e BOOTSTRAP_REGION='Nama Wilayah' \
  -e BOOTSTRAP_DIVISION='Nama Bagian' \
  -e BOOTSTRAP_POSITION='Posisi PKL' \
  -e BOOTSTRAP_START_DATE='2026-01-01' \
  -e BOOTSTRAP_END_DATE='2026-06-30' \
  backend npm run prisma:bootstrap
```

Bootstrap menolak berjalan apabila database sudah memiliki pengguna, sehingga tidak dapat mereset akun
yang sudah ada secara tidak sengaja.

### Backup dan pemulihan

Database dan volume tanda tangan adalah satu kesatuan backup. Ambil backup ketika tidak ada proses
penandatanganan yang sedang berlangsung.

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > pkl-database.dump
docker run --rm -v uraianpkl_pkl_signatures:/data -v "$PWD:/backup" alpine \
  tar czf /backup/pkl-signatures.tar.gz -C /data .
```

Uji prosedur restore secara berkala di environment terpisah. Jangan menganggap backup berhasil sebelum
restore pernah diverifikasi.

## Alur utama

1. Magang melengkapi penempatan, mencatat kegiatan Senin–Jumat, lalu mengajukan laporan.
2. Mentor menggambar dan menyimpan spesimen tanda tangan privat.
3. Mentor memilih satu atau beberapa laporan `SUBMITTED` dan menandatanganinya secara atomik.
4. Laporan `SIGNED` dapat diekspor per minggu atau seluruh periode. Minggu dan tanggal kosong tidak dicetak.

## Keamanan dan penyimpanan

- Access JWT disimpan dalam memori browser; refresh token di cookie HttpOnly dan hash sesi disimpan di PostgreSQL.
- File PNG tanda tangan disimpan di `backend/storage/private/signatures`, bukan direktori publik.
- Compose production menyediakan volume persisten terpisah untuk database dan signature; TLS tetap ditangani reverse proxy host.
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

Konfigurasi backend divalidasi saat proses dimulai. Untuk deployment di belakang reverse proxy,
atur `TRUST_PROXY` sesuai jumlah proxy tepercaya dan jangan gunakan nilai lebih luas dari topologi aktual.
