import type { Metadata } from "next";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Syarat dan ketentuan penggunaan layanan MoneySpender.",
};

const sections = [
  {
    title: "Penggunaan layanan",
    items: [
      "MoneySpender dibuat untuk membantu kamu mencatat dan melihat kondisi uang pribadi.",
      "Kamu bertanggung jawab atas data yang kamu masukkan ke aplikasi.",
      "Gunakan aplikasi secara wajar dan jangan mencoba mengganggu keamanan atau akses pengguna lain.",
    ],
  },
  {
    title: "Akun dan keamanan",
    items: [
      "Jaga email, password, dan akses Google yang terhubung dengan akunmu.",
      "Kalau merasa akun dipakai orang lain, segera ubah akses dan hubungi kontak resmi.",
      "Akses bisa dibatasi kalau ada aktivitas yang melanggar hukum atau membahayakan layanan.",
    ],
  },
  {
    title: "Ketersediaan dan perubahan layanan",
    items: [
      "Fitur bisa berubah seiring perbaikan, keamanan, dan pengembangan produk.",
      "Kami berusaha menjaga layanan tetap aktif, tapi gangguan teknis tetap bisa terjadi.",
      "Gunakan layanan dengan pertimbangan sendiri, sejauh diizinkan hukum yang berlaku.",
    ],
  },
  {
    title: "Data dan tanggung jawab",
    items: [
      "Data transaksi yang kamu input tetap milikmu. MoneySpender hanya memprosesnya agar fitur berjalan.",
      "Jangan gunakan layanan untuk konten ilegal, berbahaya, menyesatkan, atau melanggar hak pihak lain.",
      "Jika diwajibkan hukum, akses dapat ditangguhkan atau informasi tertentu dapat diberikan kepada otoritas berwenang.",
    ],
  },
  {
    title: "Paket berbayar dan pembayaran",
    items: [
      "Fitur inti MoneySpender gratis. Jika nanti tersedia paket berbayar, harga dan isi paketnya ditampilkan jelas sebelum kamu membayar.",
      "Langganan berbayar diperpanjang otomatis sampai kamu membatalkannya. Pembatalan berlaku di akhir periode yang sudah dibayar.",
      "Pembayaran diproses oleh penyedia pembayaran pihak ketiga. MoneySpender tidak menyimpan nomor kartu kamu.",
    ],
  },
  {
    title: "Pembatalan dan pengembalian dana",
    items: [
      "Kamu bisa membatalkan langganan kapan saja dari pengaturan akun. Akses berbayar tetap aktif sampai akhir periode berjalan.",
      "Pengembalian dana mengikuti hukum perlindungan konsumen yang berlaku di wilayahmu.",
      "Kalau ada tagihan yang menurutmu keliru, hubungi kontak resmi di bawah dalam 30 hari agar bisa dicek.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <PublicSiteShell
      eyebrow="Syarat"
      title="Aturan singkat biar MoneySpender tetap aman dipakai."
      description="Dengan memakai MoneySpender, kamu setuju memakai aplikasi secara wajar, menjaga akun sendiri, dan memahami batas layanan."
    >
      <div className="grid gap-6">
        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ringkasan</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Ini versi ringkas tentang cara memakai MoneySpender, tanggung jawab pengguna,
              dan batas layanan.
            </p>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Tanggal pembaruan terakhir: <span className="font-semibold text-foreground">4 Juli 2026</span>
            </p>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <Panel key={section.title} className="rounded-lg p-7 sm:p-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                <div className="space-y-3 text-sm leading-8 text-muted sm:text-base">
                  {section.items.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <Panel className="rounded-lg p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Kontak layanan</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Ada pertanyaan soal syarat layanan, akun, atau verifikasi aplikasi? Hubungi:
            </p>
            <a
              href="mailto:legendterra@gmail.com"
              className="inline-flex text-base font-semibold text-accent-strong underline-offset-4 hover:underline"
            >
              legendterra@gmail.com
            </a>
          </div>
        </Panel>
      </div>
    </PublicSiteShell>
  );
}
