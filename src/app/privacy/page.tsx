import type { Metadata } from "next";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Kebijakan privasi MoneySpender untuk pengguna web, email login, dan Google Sign-In.",
};

const sections = [
  {
    title: "Data yang dipakai",
    items: [
      "Nama, email, dan info dasar yang kamu pakai saat daftar atau login dengan Google.",
      "Catatan yang kamu simpan di MoneySpender, seperti pemasukan, pengeluaran, hutang, kategori, target, dan reminder.",
      "Data teknis seperlunya, misalnya sesi login, endpoint push notification, dan log dasar untuk keamanan.",
    ],
  },
  {
    title: "Buat apa datanya",
    items: [
      "Menjalankan fitur utama: login, dashboard, catatan transaksi, reminder, sinkronisasi, dan reset akun.",
      "Menjaga akun tetap aman dan membantu cek masalah teknis kalau ada gangguan.",
      "Mengirim reminder hanya kalau kamu memang menyalakannya.",
    ],
  },
  {
    title: "Penyimpanan dan pihak lain",
    items: [
      "Data disimpan di layanan yang dibutuhkan aplikasi, seperti hosting, autentikasi, database, dan notifikasi.",
      "Data pribadi kamu tidak dijual.",
      "Data hanya dibagikan kalau diperlukan untuk menjalankan layanan, memenuhi kewajiban hukum, atau menjaga keamanan.",
    ],
  },
  {
    title: "Hak pengguna",
    items: [
      "Kamu bisa memperbarui data akun dan catatan langsung dari aplikasi selama fiturnya tersedia.",
      "Kamu bisa meminta penghapusan akun atau penonaktifan akses lewat kontak di halaman ini.",
      "Kamu bisa berhenti memakai Google Sign-In kapan saja dari pengaturan akun Google.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <PublicSiteShell
      eyebrow="Privasi"
      title="Data kamu dipakai seperlunya."
      description="MoneySpender butuh beberapa data agar login, catatan, dashboard, dan reminder bisa berjalan. Halaman ini menjelaskan versi singkat dan jelasnya."
    >
      <div className="grid gap-6">
        <Panel className="rounded-[32px] p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ringkasan</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              MoneySpender adalah aplikasi catatan keuangan pribadi. Data dipakai untuk
              menyimpan catatanmu, menampilkan dashboard, menjaga login, dan mengirim
              reminder yang kamu aktifkan.
            </p>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Tanggal pembaruan terakhir: <span className="font-semibold text-foreground">2 April 2026</span>
            </p>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <Panel key={section.title} className="rounded-[32px] p-7 sm:p-8">
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

        <Panel className="rounded-[32px] p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Kontak privasi</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Ada pertanyaan soal privasi, penghapusan data, atau Google Sign-In? Hubungi:
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
