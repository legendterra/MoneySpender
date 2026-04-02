# Tutorial Lengkap MoneySpender Dari Nol Sampai Siap Produksi

Panduan ini khusus untuk project ini:

- frontend: Next.js 16 + React 19
- auth dan database: Supabase
- deployment: Vercel
- reminder: Vercel Cron + Web Push
- login sosial: Google saja

Tutorial ini juga sudah menyesuaikan perbaikan untuk masalah:

```text
Database error saving new user
```

Penyebab paling umum error itu adalah trigger `auth.users` lama yang gagal saat signup. Pada versi project ini, trigger tersebut sudah dihapus dan data awal user dibuat saat user pertama kali masuk ke aplikasi.

## 1. Yang perlu disiapkan

- Node.js 20 atau lebih baru
- npm 10 atau lebih baru
- akun [Supabase](https://supabase.com/)
- akun [Vercel](https://vercel.com/)
- akun [Google Cloud Console](https://console.cloud.google.com/) untuk Google Login

## 2. File penting di project ini

- [`package.json`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/package.json)
- [`.env.example`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/.env.example)
- [`supabase/schema.sql`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/supabase/schema.sql)
- [`vercel.json`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/vercel.json)
- [`src/components/auth/auth-panel.tsx`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/components/auth/auth-panel.tsx)
- [`src/app/auth/callback/route.ts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/auth/callback/route.ts)
- [`src/lib/data.ts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/lib/data.ts)

## 3. Install dan jalankan lokal

Di PowerShell:

```powershell
cd "C:\Project\TEMPAT BELAJAR\MoneySpender"
npm install
Copy-Item .env.example .env.local
```

Jalankan aplikasi:

```powershell
npm run dev
```

App akan terbuka di:

```text
http://localhost:3000
```

## 4. Buat project Supabase baru

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Klik `New project`
3. Pilih organization
4. Isi nama project
5. Pilih region terdekat
6. Simpan database password
7. Tunggu project selesai

Sesudah project jadi, ambil:

- `Project URL`
- `Publishable key` atau `anon key`
- `service_role key`

Catatan keamanan:

- `service_role key` adalah secret server. Jangan pernah taruh di frontend.
- Jika key sempat tertulis di dokumen atau chat, segera rotate dari dashboard Supabase.

## 5. Isi `.env.local`

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:your-email@example.com
CRON_SECRET=
```

## 6. Generate VAPID dan CRON secret

Project ini sudah punya helper command:

```powershell
npm run generate:vapid
npm run generate:cron-secret
```

Copy hasilnya ke `.env.local`.

## 7. Perbaiki error `Database error saving new user`

Kalau sebelumnya Anda sudah pernah menjalankan schema lama, lakukan ini:

1. Buka Supabase `SQL Editor`
2. Jalankan ulang seluruh isi file [`supabase/schema.sql`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/supabase/schema.sql)

Kenapa ini penting:

- schema terbaru akan menghapus trigger lama `on_auth_user_created`
- schema terbaru juga menghapus function lama `handle_new_user`
- data default user sekarang dibuat oleh aplikasi saat user pertama login, bukan saat proses signup internal auth

Bagian penting di schema terbaru:

```sql
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
```

Jika Anda masih mendapatkan error setelah ini, biasanya penyebabnya salah satu dari:

- schema belum dijalankan ulang
- project masih memakai SQL lama
- provider auth belum dikonfigurasi benar
- redirect URL belum benar

## 8. Jalankan schema database

Di Supabase:

1. Buka `SQL Editor`
2. Copy semua isi [`supabase/schema.sql`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/supabase/schema.sql)
3. Jalankan

Schema ini membuat:

- `profiles`
- `categories`
- `transactions`
- `reminder_preferences`
- `push_subscriptions`
- `notification_logs`
- enum `transaction_type`
- index penting
- RLS policies

## 9. Kenapa sekarang signup lebih aman

Project ini tidak lagi memakai trigger signup untuk membuat data default.

Sebagai gantinya, saat user sudah berhasil login, aplikasi otomatis menjalankan bootstrap lewat:

- [`src/lib/data.ts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/lib/data.ts)

Yang akan membuat atau memastikan ada:

- row di `profiles`
- row di `reminder_preferences`
- kategori default pemasukan
- kategori default pengeluaran

Keuntungan pendekatan ini:

- signup tidak mudah gagal karena function database tambahan
- Google login dan email login sama-sama aman
- user baru tetap langsung siap pakai saat pertama masuk

## 10. Konfigurasi URL Auth di Supabase

Masuk ke:

1. `Authentication`
2. `URL Configuration`

Isi `Site URL`:

```text
http://localhost:3000
```

Tambahkan `Redirect URLs`:

```text
http://localhost:3000/**
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/dashboard
http://localhost:3000/auth/callback?next=/reset-password
```

Nanti untuk production tambahkan juga:

```text
https://your-domain.com/**
https://your-domain.com/auth/callback
https://your-domain.com/auth/callback?next=/dashboard
https://your-domain.com/auth/callback?next=/reset-password
https://*-your-team.vercel.app/**
```

Referensi resmi:

- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

## 11. Aktifkan Email auth

Di Supabase:

1. Buka `Authentication`
2. Pastikan provider `Email` aktif

Flow yang dipakai project ini:

- sign up email + password
- sign in email + password
- OTP / magic link email
- reset password email

## 12. Setup Google Login

### Di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru
3. Buka area OAuth / Google Auth Platform
4. Selesaikan `Branding`, `Audience`, dan `Data Access`
5. Buat `OAuth Client ID`
6. Pilih tipe `Web application`

Tambahkan `Authorized JavaScript origins`:

```text
http://localhost:3000
https://your-domain.com
https://your-project.vercel.app
```

Jika Anda memakai preview domain Vercel dan ingin test dari preview, tambahkan origin yang relevan juga.

### Di Supabase

1. Buka `Authentication`
2. Buka `Providers`
3. Aktifkan `Google`
4. Isi `Client ID`
5. Isi `Client Secret`

Referensi resmi:

- [Supabase Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 13. Test auth di lokal

Jalankan:

```powershell
npm run dev
```

Lalu test:

1. Register dengan email + password
2. Login email + password
3. Kirim OTP / magic link
4. Reset password
5. Login Google
6. Logout

Jika Google login gagal, cek:

- Google provider di Supabase aktif
- `Client ID` dan `Client Secret` benar
- `Site URL` benar
- `Redirect URLs` benar
- origin localhost dan domain production sudah didaftarkan

## 14. Test bootstrap user baru

Ini langkah penting untuk memastikan error lama benar-benar hilang:

1. Buat akun baru
2. Login
3. Masuk ke dashboard
4. Buka settings
5. Pastikan kategori default sudah muncul

Kalau kategori default muncul, berarti bootstrap user bekerja normal.

## 15. Test transaksi dan dashboard

Sesudah login:

1. Tambah pemasukan
2. Tambah pengeluaran
3. Cek total dashboard
4. Cek top 10 pemasukan
5. Cek top 10 pengeluaran
6. Cek filter bulan
7. Cek target tabungan
8. Cek tambah dan hapus kategori

## 16. Test push notification lokal

Langkah:

1. Login
2. Buka `Settings`
3. Aktifkan `web push`
4. Izinkan notifikasi browser

Untuk test route reminder secara manual:

```powershell
$headers = @{ Authorization = "Bearer YOUR_CRON_SECRET" }
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/reminder/morning" -Headers $headers
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/reminder/evening" -Headers $headers
```

Referensi:

- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

## 17. Ganti logo

Logo placeholder ada di:

- [`public/logo-placeholder.svg`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/public/logo-placeholder.svg)

Kalau mau ganti, cukup replace file itu.

## 18. Push ke Git

Kalau belum ada repository:

```powershell
git init
git add .
git commit -m "MoneySpender production setup"
```

Lalu push ke GitHub/GitLab/Bitbucket.

## 19. Deploy ke Vercel

Cara dashboard:

1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik `Add New Project`
3. Import repository
4. Pastikan framework terdeteksi sebagai Next.js
5. Deploy

Atau via CLI:

```powershell
npm install -g vercel
vercel
vercel --prod
```

## 20. Isi Environment Variables di Vercel

Isi semua variable ini di `Project Settings -> Environment Variables`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
CRON_SECRET
```

Untuk production:

```text
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Referensi:

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

## 21. Set domain production

Di Vercel:

1. Buka `Project Settings`
2. Buka `Domains`
3. Tambahkan domain utama
4. Arahkan DNS sesuai instruksi

Setelah domain aktif:

1. Update `NEXT_PUBLIC_APP_URL`
2. Update `Site URL` di Supabase
3. Update `Redirect URLs` di Supabase
4. Pastikan origin Google ikut diperbarui

## 22. Atur cron production

File [`vercel.json`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/vercel.json) sudah berisi:

```json
{
  "crons": [
    { "path": "/api/cron/reminder/morning", "schedule": "0 0 * * *" },
    { "path": "/api/cron/reminder/evening", "schedule": "0 12 * * *" }
  ]
}
```

Karena Vercel Cron memakai UTC:

- `00:00 UTC` = `07:00 WIB`
- `12:00 UTC` = `19:00 WIB`

Referensi:

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

Catatan:

- Berdasarkan dokumentasi Vercel yang saya cek, plan Hobby memiliki batasan cron yang ketat.
- Karena project ini memakai 2 cron per hari, cek plan Anda sebelum go-live.

## 23. Checklist test production

Sesudah live:

1. Buka domain production
2. Register user baru
3. Verifikasi email
4. Login email
5. Login Google
6. Masuk dashboard
7. Tambah pemasukan
8. Tambah pengeluaran
9. Buka settings
10. Pastikan kategori default muncul
11. Aktifkan push notification
12. Test endpoint cron manual

## 24. Troubleshooting cepat

### Masih muncul `Database error saving new user`

Cek urutan ini:

1. Jalankan ulang [`supabase/schema.sql`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/supabase/schema.sql)
2. Pastikan trigger lama benar-benar sudah hilang
3. Buat user baru lagi
4. Login user itu ke aplikasi

Untuk cek trigger lama masih ada atau tidak:

```sql
select tgname
from pg_trigger
where tgname = 'on_auth_user_created';
```

Kalau query itu masih mengembalikan row, berarti schema lama belum benar-benar dibersihkan.

### Login Google gagal

Cek:

- provider Google aktif di Supabase
- client ID benar
- client secret benar
- JavaScript origin benar
- redirect URL benar
- `NEXT_PUBLIC_APP_URL` sudah sesuai domain

### User berhasil login tapi kategori kosong

Berarti bootstrap user belum jalan dengan benar.

Cek:

- [`src/lib/data.ts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/lib/data.ts)
- policy RLS di `profiles`, `categories`, `reminder_preferences`
- user benar-benar sudah login

### Push notification tidak muncul

Cek:

- browser mengizinkan notifikasi
- key VAPID benar
- row `push_subscriptions` terisi
- app sudah di-install sebagai PWA jika test di mobile

## 25. Perintah yang paling sering dipakai

```powershell
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run generate:vapid
npm run generate:cron-secret
```

## 26. Referensi resmi

- [Supabase SSR client for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Social Login Overview](https://supabase.com/docs/guides/auth/social-login)
- [Supabase Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

## 27. Urutan paling singkat kalau ingin langsung live

1. Buat Supabase project
2. Isi `.env.local`
3. Jalankan [`supabase/schema.sql`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/supabase/schema.sql)
4. Setup Google provider
5. Test register/login lokal
6. Test Google login lokal
7. Test kategori default muncul
8. Push ke Git
9. Deploy ke Vercel
10. Isi env di Vercel
11. Tambahkan domain
12. Update URL Supabase
13. Test production
