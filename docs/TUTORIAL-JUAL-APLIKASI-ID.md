# Tutorial: Dari MoneySpender Gratis Menjadi Produk Global Berbayar

Panduan lengkap mengubah MoneySpender menjadi produk freemium yang bisa dijual di Web, Android, dan iOS.

**Semua fase sudah diimplementasikan di kode.** Yang tersisa hanyalah langkah yang butuh akun eksternal milikmu: Lemon Squeezy, Upstash, Sentry, Google Play Console, dan Apple Developer. Tutorial ini menjelaskan cara mengaktifkan tiap fase.

Ringkasan status:

| Fase | Kode | Yang masih perlu kamu lakukan |
|---|---|---|
| 0. Hardening | ✅ Selesai | Isi DSN Sentry + kredensial Upstash (opsional) |
| 1. Billing freemium | ✅ Selesai | Buat akun Lemon Squeezy, isi 4 env var, jalankan SQL migrasi |
| 2. i18n + multi-currency | ✅ Infrastruktur + halaman publik EN/ID | Ekstrak teks halaman dalam-app secara bertahap |
| 3. Android | ✅ Signing + permission siap | Generate keystore, daftar Play Console, upload AAB |
| 4. iOS | ✅ Capacitor config siap | Butuh Mac: `npx cap add ios` → Xcode → App Store |
| 5. Marketing | ✅ Pricing page, OG image, sitemap | Konten sosial + launch |

---

## Fase 0 — Pengerasan Produksi (SUDAH DI KODE)

### Apa yang sudah ditambahkan

| Fitur | File | Status |
|---|---|---|
| Rate limiting API | `src/lib/rate-limit.ts` + route import/export/push | Aktif otomatis |
| Header CSP | `next.config.ts` | Aktif otomatis |
| Error tracking (Sentry) | `sentry.*.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts` | Perlu DSN |
| Analitik (Vercel Analytics) | `src/app/layout.tsx` | Aktif otomatis saat deploy di Vercel |
| Unit test (Vitest) | `tests/unit/` — 21 test | `npm run test` |
| Smoke test (Playwright) | `tests/e2e/smoke.spec.ts` | `npm run test:e2e` |
| CI GitHub Actions | `.github/workflows/ci.yml` | Aktif setelah push ke GitHub |
| Halaman legal v2 | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` | Sudah live |
| SEO dasar | `src/app/robots.ts`, `src/app/sitemap.ts` | Aktif otomatis |

### 0.1 Aktifkan Sentry (error tracking)

1. Daftar gratis di [sentry.io](https://sentry.io), buat project `Next.js`.
2. Copy DSN-nya, lalu isi di `.env.local` dan di Vercel Environment Variables:

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
```

3. Tanpa DSN, Sentry otomatis nonaktif (tidak error, tidak ada overhead berarti).
4. Tes: buka halaman yang error, lalu cek dashboard Sentry — error harus muncul di sana.

### 0.2 Aktifkan rate limit lintas server (opsional tapi disarankan)

Tanpa konfigurasi apa pun, rate limiter berjalan in-memory per instance serverless — cukup untuk menahan burst, tapi tidak shared antar instance. Untuk limit yang konsisten:

1. Daftar gratis di [upstash.com](https://upstash.com), buat Redis database.
2. Copy REST URL dan token, isi di env:

```env
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxx
```

Limit saat ini: import/export 20x per 10 menit per user, push subscribe 10x per menit, template download 10x per menit per IP. Ubah angkanya langsung di masing-masing route.

### 0.3 Aktifkan Vercel Analytics

1. Di dashboard Vercel, buka project → tab `Analytics` → klik `Enable`.
2. Komponen `<Analytics />` sudah terpasang di `src/app/layout.tsx`. Selesai.

### 0.4 Jalankan test

```powershell
npm run test        # unit test (cepat, tanpa browser)
npx playwright install chromium   # sekali saja
npm run test:e2e    # smoke test halaman publik
```

### 0.5 Aktifkan CI

1. Push project ke GitHub (`.github/workflows/ci.yml` sudah ada).
2. Setiap push/PR ke `main` otomatis menjalankan lint, typecheck, test, dan build.
3. Di GitHub → Settings → Branches, aktifkan branch protection agar merge hanya boleh kalau CI hijau.

### 0.6 Verifikasi CSP setelah deploy

Buka DevTools → Console di production. Kalau ada resource yang diblokir CSP (misalnya kamu menambah layanan pihak ketiga baru), tambahkan origin-nya di daftar `contentSecurityPolicy` dalam `next.config.ts`.

---

## Fase 1 — Langganan Freemium (Lemon Squeezy) — SUDAH DI KODE

Kenapa Lemon Squeezy dan bukan Stripe: akun Stripe Indonesia hanya menerima IDR dan tidak mendukung transaksi lintas negara, sehingga tidak bisa dipakai jualan global. Lemon Squeezy adalah *Merchant of Record* — pendaftaran mudah dari Indonesia, mereka yang mengurus pajak global, pembeli tetap melihat mata uang lokal, dan payout ke kamu via PayPal/transfer.

Yang sudah ada di kode:

- Tabel `subscriptions` + RLS: `supabase/migrations/2026-07-04-subscriptions.sql` (juga di `schema.sql`)
- Resolusi paket + gating: `src/lib/billing.ts` (`getCurrentPlan`, `requirePro`)
- Route billing: `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook`
- Halaman `/pricing` (EN/ID) dengan satu paket Pro universal, komponen `<ProGate>`, panel langganan di Settings
- Fitur yang digate: import/export Excel (API + UI), audit log, transaksi berulang & notifikasi budget (cron)

**Perilaku penting**: selama env Lemon Squeezy kosong, billing nonaktif dan SEMUA user dianggap Pro — aplikasi berjalan persis seperti sebelumnya. Kamu bisa deploy kapan saja tanpa takut fitur terkunci.

### Cara mengaktifkan billing

1. Daftar di [lemonsqueezy.com](https://www.lemonsqueezy.com), buat store. Store baru langsung bisa dipakai dalam **test mode**; untuk menerima uang sungguhan, ajukan aktivasi store (isi profil + data payout, review biasanya 1-3 hari).
2. Buat produk `MoneySpender Pro` dengan **satu variant**: subscription, interval monthly, harga USD (mis. $3-5/bulan — pembeli otomatis melihat estimasi mata uang lokal mereka).
3. Jalankan `supabase/migrations/2026-07-04-subscriptions.sql` di Supabase SQL Editor. (Kalau dulu pernah menjalankan versi lama bertabel `stripe_*`, jalankan `drop table if exists public.subscriptions;` dulu.)
4. Di `Settings → API`, buat API key. Catat juga Store ID (menu `Settings → Stores`) dan Variant ID (buka variant produknya, ID ada di URL/detail).
5. Di `Settings → Webhooks`, tambah endpoint `https://money.moneyspender.net/api/billing/webhook`, isi signing secret buatanmu sendiri, dan centang event `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`.
6. Isi env (lokal di `.env.local`, production di Vercel):

```env
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx
LEMONSQUEEZY_VARIANT_ID=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
```

7. Deploy ulang. Halaman `/pricing` otomatis menampilkan tombol langganan, dan fitur Pro mulai digate untuk user Free.

### Pembagian paket saat ini

- **Free**: transaksi, dashboard, kategori, dompet, target, PWA.
- **Pro** (satu paket universal, langganan bulanan): import/export Excel/CSV, audit log, transaksi berulang, notifikasi budget.
- Mau menambah fitur ke Pro? Bungkus komponennya dengan `<ProGate feature="...">` dan tambahkan `requirePro()` di route API-nya — lihat contoh di `src/app/(workspace)/settings/page.tsx` dan `src/app/api/import/transactions/route.ts`.

### Testing billing

Selama store masih test mode, checkout memakai kartu tes `4242 4242 4242 4242` (exp bebas di masa depan, CVC bebas). Untuk menerima webhook di lokal, expose port dengan `ngrok http 3000` lalu arahkan endpoint webhook ke URL ngrok — atau tes langsung di preview deployment Vercel.

Alur yang wajib dites: upgrade → fitur terbuka; batalkan di portal → fitur tetap aktif sampai akhir periode → terkunci setelahnya.

---

## Fase 2 — Multi-bahasa dan Multi-mata-uang — SUDAH DI KODE

### 2.1 i18n (next-intl) — yang sudah ada

- `next-intl` terpasang, locale dibaca dari cookie `locale` (default `id`) lewat `src/i18n/request.ts` — tanpa mengubah struktur URL.
- `messages/id.json` + `messages/en.json` berisi teks shell publik, homepage, dan halaman pricing.
- Tombol ganti bahasa (`EN`/`ID`) ada di navigasi halaman publik (`src/components/language-switcher.tsx`).
- `<html lang>` sudah dinamis mengikuti locale.

Yang tersisa (kerjakan bertahap, tidak memblokir rilis):

1. Halaman auth, privacy, dan terms masih Bahasa Indonesia — tambahkan key-nya ke `messages/*.json` lalu pakai `getTranslations()` seperti contoh di `src/app/page.tsx`.
2. Halaman dalam-app (dashboard dll.) masih Indonesia. Calon pembeli global melihat halaman publik dulu, jadi ini prioritas kedua.

### 2.2 Mata uang per user — yang sudah ada

- Dropdown mata uang di Settings → Profil (8 mata uang: IDR, USD, EUR, GBP, SGD, MYR, JPY, AUD — daftar di `SUPPORTED_CURRENCIES`, `src/lib/constants.ts`).
- `formatCurrency()`/`formatCompactCurrency()` memformat sesuai locale mata uangnya (USD → `$1,234.56`, IDR → `Rp 1.235`).
- Pilihan tersimpan di `profiles.currency_code` dan dipakai di seluruh tampilan nominal.

Catatan: ini *display currency*, bukan konversi kurs. Konversi antar mata uang adalah fitur terpisah (butuh API kurs) — jangan dikerjakan dulu.

---

## Fase 3 — Rilis Android (Play Store) — SIGNING SUDAH DI KODE

### 3.1 Signing key

`build.gradle.kts` sudah membaca keystore dari `local.properties` — build release otomatis ditandatangani begitu properti diisi (tanpa properti, build debug tetap normal). Generate keystore sekali:

```powershell
keytool -genkeypair -v -keystore C:\keys\moneyspender-release.keystore -alias moneyspender -keyalg RSA -keysize 2048 -validity 10000
```

Simpan keystore DI LUAR folder git (hilang keystore = tidak bisa update app selamanya). Lalu di `Android/local.properties`:

```properties
MONEYSPENDER_KEYSTORE_PATH=C\:\\keys\\moneyspender-release.keystore
MONEYSPENDER_KEYSTORE_PASSWORD=xxx
MONEYSPENDER_KEY_ALIAS=moneyspender
MONEYSPENDER_KEY_PASSWORD=xxx
```

### 3.2 Izin notifikasi

`POST_NOTIFICATIONS` sudah dideklarasikan di `AndroidManifest.xml`. Runtime permission prompt baru perlu ditambahkan saat kamu integrasi FCM (v1.1) — tanpa notifikasi yang benar-benar dikirim, prompt hanya mengganggu user.

### 3.3 Play Store

1. Daftar [Play Console](https://play.google.com/console) ($25 sekali bayar).
2. Build: `./gradlew bundleRelease` → upload `app-release.aab`.
3. Siapkan: 2+ screenshot per bentuk layar, feature graphic 1024x500, deskripsi, kebijakan privasi (pakai `https://money.moneyspender.net/privacy`), form Data Safety.
4. **Soal pembayaran**: jangan pasang tombol beli di dalam APK. Pola aman: app Android hanya *membaca* status Pro dari Supabase; pembelian terjadi di web. Jangan menautkan/mengarahkan user dari dalam app ke halaman pembayaran web (itu yang dilarang Google) — cukup tampilkan fitur sesuai status akun.

### 3.4 Rilis bertahap

Internal testing → closed testing (perlu 12+ tester selama 14 hari untuk akun personal baru) → production.

---

## Fase 4 — iOS (Capacitor) — CONFIG SUDAH DI KODE

Capacitor sudah terpasang (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`) dan `capacitor.config.ts` sudah dikonfigurasi memuat versi web production (mode remote, cocok untuk app SSR ini). Sisanya butuh Mac:

1. Butuh Mac + Xcode + [Apple Developer Program](https://developer.apple.com) ($99/tahun).
2. Di Mac, clone repo lalu: `npm install` → `npx cap add ios` → `npx cap open ios`.
3. Set signing team di Xcode → archive → upload ke App Store Connect.
5. Aturan pembayaran Apple sama ketatnya dengan Google: tampilkan fitur sesuai status akun, tanpa tombol/link pembelian eksternal di dalam app.
6. Review Apple ketat terhadap "app yang cuma website". Tambahkan nilai native: push notification (via Capacitor Push + APNs), haptics, dan widget ringkasan agar lolos review.

Sementara belum ada app iOS, user iPhone tetap bisa install PWA dari Safari (`Share → Add to Home Screen`) — sudah didukung kode sekarang.

---

## Fase 5 — Marketing dan Peluncuran — DASAR SUDAH DI KODE

Sudah ada: halaman `/pricing` dua bahasa, OpenGraph image (`src/app/opengraph-image.tsx`), `sitemap.xml` + `robots.txt`, homepage dengan CTA ke pricing.

Yang tersisa (non-kode):

1. **Email support**: buat alamat khusus (mis. `support@moneyspender.net` via Cloudflare Email Routing, gratis) dan ganti `legendterra@gmail.com` di halaman privacy/terms.
2. **Screenshot & konten**: tambahkan screenshot dashboard asli ke homepage begitu ada data yang bagus untuk dipamerkan.
3. **Kanal peluncuran**: Product Hunt, X/Twitter, Reddit r/personalfinance dan komunitas finansial Indonesia, TikTok demo singkat.
4. **Ukur funnel**: pasang event analytics di titik krusial: daftar → transaksi pertama → buka pricing → checkout. Dari sini kamu tahu di mana user berhenti.

---

## Urutan Aktivasi yang Disarankan (semua kode sudah siap)

1. Push ke GitHub, deploy ke Vercel, cek CI hijau dan CSP tidak memblokir apa pun.
2. Aktifkan Sentry + Upstash + Vercel Analytics (30 menit).
3. Jalankan SQL migrasi subscriptions, buat produk di Lemon Squeezy (test mode), isi env, tes checkout end-to-end, lalu ajukan aktivasi store. **Ini yang membuat aplikasi mulai menghasilkan uang.**
4. Generate keystore Android, daftar Play Console, `./gradlew bundleRelease`, mulai internal testing.
5. Lanjutkan ekstraksi i18n halaman auth/privacy/terms + dalam-app secara bertahap.
6. iOS via Mac (terakhir — pasar web+Android sudah bisa jalan duluan).
