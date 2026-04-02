# MoneySpender

Aplikasi laporan keuangan mobile-first berbasis React + Next.js App Router, Supabase, dan Vercel.

Tutorial lengkap lokal sampai production ada di:

- [`docs/PRODUCTION-SETUP-ID.md`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/docs/PRODUCTION-SETUP-ID.md)

## Fitur utama

- Login, register, logout
- Email password login
- OTP / magic link email
- Google OAuth
- Lupa password via email
- Dashboard bulanan dengan:
  - total pemasukan
  - total pengeluaran
  - saldo bulan berjalan
  - rasio menabung
  - top 10 pemasukan terbesar
  - top 10 pengeluaran terbesar
  - grafik cashflow 6 bulan
  - grafik kategori pengeluaran
  - progress goal tabungan bulanan dan tahunan
- Form pemasukan dan pengeluaran
- CRUD kategori
- Setting profil, target tabungan, mata uang
- Day mode dan night mode pastel
- PWA installable untuk web/mobile
- Push reminder pagi dan malam via Vercel Cron + Web Push

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase Auth + Database
- Vercel Cron
- Framer Motion
- Recharts

## Jalankan lokal

1. Copy env:

```bash
cp .env.example .env.local
```

2. Isi semua env Supabase dan VAPID.

3. Jalankan schema SQL di Supabase SQL Editor:

[`supabase/schema.sql`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/supabase/schema.sql)

4. Install dependency bila perlu:

```bash
npm install
```

5. Jalanin dev server:

```bash
npm run dev
```

## Environment

Wajib diisi:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`

## Setup Supabase Auth

Di dashboard Supabase:

1. Aktifkan Email auth
2. Aktifkan Google provider
3. Tambahkan redirect URL:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.vercel.app/auth/callback`
4. Untuk reset password, gunakan redirect:
   - `http://localhost:3000/auth/callback?next=/reset-password`
   - `https://your-domain.vercel.app/auth/callback?next=/reset-password`

## Setup Web Push

Generate VAPID key pair, lalu isi:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Notifikasi akan aktif setelah:

1. user login
2. user mengizinkan notifikasi
3. user mengaktifkan push di halaman setting
4. app dipasang sebagai PWA pada perangkat mobile

## Deploy ke Vercel

1. Push project ke repo Git
2. Import ke Vercel
3. Isi semua Environment Variables
4. Deploy

Cron yang sudah disiapkan di [`vercel.json`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/vercel.json):

- reminder pagi sekitar 07.00 WIB
- reminder malam sekitar 19.00 WIB

## Struktur penting

- [`src/app/auth/page.tsx`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/auth/page.tsx)
- [`src/app/(workspace)/dashboard/page.tsx`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/(workspace)/dashboard/page.tsx)
- [`src/app/(workspace)/income/page.tsx`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/(workspace)/income/page.tsx)
- [`src/app/(workspace)/expenses/page.tsx`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/(workspace)/expenses/page.tsx)
- [`src/app/(workspace)/settings/page.tsx`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/(workspace)/settings/page.tsx)
- [`src/app/api/cron/reminder/[slot]/route.ts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/api/cron/reminder/[slot]/route.ts)
- [`src/app/api/push/subscribe/route.ts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/src/app/api/push/subscribe/route.ts)

## Catatan

- Logo placeholder ada di [`public/logo-placeholder.svg`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/public/logo-placeholder.svg) dan bisa langsung Anda ganti.
- Reminder mobile memanfaatkan web push PWA. Untuk iPhone, hasil terbaik didapat saat aplikasi dipasang ke Home Screen.
