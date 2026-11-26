# MoneySpender v2 — Checklist Uji Manual di HP (Android & iPhone)

Gunakan daftar ini setelah deploy ke `https://money.moneyspender.net` untuk memastikan pengalaman harian di HP asli mulus (mengacu pada [PLAN.md §9.2](./PLAN.md)).

## 1. Instalasi PWA & Tampilan Awal
- [ ] **Android (Chrome):** Buka `https://money.moneyspender.net/install` → menu titik tiga → **Install app** → ikon muncul di home screen dan terbuka full-screen (`standalone`, tanpa address bar).
- [ ] **iPhone (Safari iOS 16.4+):** Buka `https://money.moneyspender.net/install` → tombol **Share** → **Add to Home Screen** → ikon & splash screen rapi, status bar tidak menimpa judul atas (*notch / Dynamic Island safe area*).
- [ ] Buka dari home screen di mode **Dark** dan **Light** → kontras teks jelas, tidak ada elemen berbayang/card, semua tab memakai garis bawah (*underline tabs*).

## 2. Alur Catat 3 Tap & Ergonomi Satu Tangan
- [ ] Tombol **(+)** di tengah tab bawah mudah dijangkau ibu jari.
- [ ] Catat pengeluaran baru (misal Rp25.000) via keypad angka → keyboard sistem tidak muncul menutupi nominal saat memakai keypad angka.
- [ ] Setelah tekan **Simpan**, transaksi langsung muncul di **Beranda → Hari ini** dan saldo dompet ikut berubah **tanpa tarik/refresh manual**.
- [ ] Buka **Riwayat** → tap baris transaksi → coba **Ubah**, **Duplikat**, dan **Hapus + Urungkan (Undo)** dari toast.
- [ ] Uji **Transfer antar dompet** (+ opsional *Biaya admin* di v2.1) → saldo dompet asal & tujuan langsung sesuai.

## 3. Hutang, Dompet, Budget & Laporan
- [ ] Buka **Hutang** → pindah tab **Hutang / Piutang** → tambah hutang baru → coba **Bayar sebagian** lalu **Lunas** → pastikan saldo dompet ikut berubah sesuai arah hutang/piutang.
- [ ] Buka **Dompet** → cek Total Aset & Kekayaan Bersih → coba **Sesuaikan saldo** (v2.1) dan **Hide saldo (`••••`)** di header.
- [ ] Buka **Budget** → ubah limit kategori → angka sisa & persentase langsung berubah tanpa reload.
- [ ] Buka **Laporan** → pindah periode (Bulan / Tahun) → buka **Lihat semua** kategori/tempat belanja (paging jalan) → coba **Export XLSX**.

## 4. Navigasi iOS (Tanpa Gestur Back Bawaan)
- [ ] Masuk ke halaman turunan (`/settings/profil`, `/settings/notifikasi`, `/wallets`, `/budget`, `/reports`) → pastikan tombol **Kembali (`<`)** di kiri atas selalu terlihat dan berfungsi baik di iPhone PWA.

## 5. Notifikasi Digest (Web Push) & Jam Tenang
- [ ] Buka **Pengaturan → Notifikasi** → aktifkan izin notifikasi (di iPhone wajib dibuka dari ikon PWA Home Screen, bukan Safari tab).
- [ ] Tekan **Kirim notifikasi tes** → notifikasi masuk ke HP dalam < 5 detik, dan saat diketuk membuka `/dashboard`.
- [ ] Aktifkan **Sembunyikan nominal di layar kunci (`hide_amounts`)** → kirim tes / picu Cloudflare Worker `digest-cron` manual → pastikan nominal uang tidak tampil di lock screen.
- [ ] Pastikan jam aktif (misal 09:00–21:00 WIB) dihormati (tidak ada push di luar jam aktif).

## 6. Mode Offline & Antrean Sinkronisasi
- [ ] Aktifkan **Mode Pesawat (Airplane Mode)**.
- [ ] Buka halaman baru yang belum di-cache → tampil halaman `/offline` yang rapi (bukan error browser bawaan) dan data akun privat tidak bocor dari cache.
- [ ] Catat 1 transaksi saat offline → muncul notifikasi antrean offline (dengan dompet tetap tersimpan).
- [ ] Matikan Mode Pesawat → transaksi otomatis tersinkron ke Supabase dan muncul di Beranda & Riwayat.

## 7. Bahasa, Tema & Privasi
- [ ] Ganti bahasa `ID ↔ EN` di Pengaturan → keluar & masuk ulang → preferensi bahasa tetap tersimpan per akun.
- [ ] Uji **Kunci Aplikasi (PIN/Passkey)** (v2.1) & **Quick Capture (Tempel Mutasi)** di Catat.
