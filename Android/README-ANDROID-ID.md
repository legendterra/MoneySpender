# MoneySpender Android Native

Folder [`Android`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android) ini adalah project Android native terpisah yang bisa dibuka langsung di Android Studio.

## Fitur yang sudah dicakup

- Login email + password
- Register email + password
- OTP / magic link email
- Google login lewat Supabase OAuth + deep link Android
- Reset password via email
- Dashboard ringkasan bulan
- CRUD pemasukan
- CRUD pengeluaran
- Tambah hutang
- Tandai hutang lunas
- Riwayat semua transaksi
- Update profil, target tabungan, dan mata uang
- Kelola kategori
- Simpan preferensi reminder
- Logout

## Cara buka di Android Studio

1. Buka Android Studio
2. Pilih `Open`
3. Arahkan ke:

```text
C:\Project\TEMPAT BELAJAR\MoneySpender\Android
```

## Setup cepat

Buat file [`Android/local.properties`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/local.properties):

```properties
sdk.dir=C\:\\Users\\Administrator\\AppData\\Local\\Android\\Sdk
MONEYSPENDER_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
MONEYSPENDER_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
MONEYSPENDER_APP_BASE_URL=https://moneyspender.net
MONEYSPENDER_DEEPLINK_SCHEME=moneyspender
MONEYSPENDER_DEEPLINK_HOST=auth
```

## Setting Supabase Auth untuk Android

Tambahkan redirect URL berikut di Supabase Auth:

```text
moneyspender://auth
moneyspender://auth/callback
moneyspender://auth/**
```

Google provider di Supabase tetap aktif seperti yang sudah dipakai website Anda.

## Cara run

1. Pastikan emulator atau HP Android aktif
2. Sync Gradle
3. Klik `Run`
4. Login pakai akun yang sama dengan web

## Catatan penting

- App Android ini memakai backend yang sama dengan website:
  - Supabase untuk auth + database
  - domain produksi [moneyspender.net](https://moneyspender.net)
- Data utama diakses langsung ke Supabase memakai session user.
- Flow pembuatan data awal user juga sudah ditangani dari Android:
  - `profiles`
  - `reminder_preferences`
  - kategori default
- Reminder native Android saat ini menyimpan preferensi ke Supabase, tetapi untuk notifikasi sistem Android penuh tetap perlu integrasi FCM di backend jika nanti Anda ingin push notification native.

## File penting

- [`Android/app/build.gradle.kts`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/app/build.gradle.kts)
- [`Android/app/src/main/AndroidManifest.xml`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/app/src/main/AndroidManifest.xml)
- [`Android/app/src/main/java/net/moneyspender/android/MainActivity.kt`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/app/src/main/java/net/moneyspender/android/MainActivity.kt)
- [`Android/app/src/main/java/net/moneyspender/android/data/MoneySpenderRepository.kt`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/app/src/main/java/net/moneyspender/android/data/MoneySpenderRepository.kt)
- [`Android/app/src/main/java/net/moneyspender/android/viewmodel/MoneySpenderViewModel.kt`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/app/src/main/java/net/moneyspender/android/viewmodel/MoneySpenderViewModel.kt)
- [`Android/app/src/main/java/net/moneyspender/android/ui/MoneySpenderRoot.kt`](/C:/Project/TEMPAT%20BELAJAR/MoneySpender/Android/app/src/main/java/net/moneyspender/android/ui/MoneySpenderRoot.kt)

## Referensi resmi

- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase social login Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Kotlin quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/kotlin)
