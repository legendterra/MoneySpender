import type { Metadata } from "next";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Kebijakan privasi MoneySpender untuk pengguna web, email login, dan Google Sign-In.",
};

const sections = [
  {
    title: "Informasi yang kami kumpulkan",
    items: [
      "Data akun seperti nama, email, dan identitas dasar yang Anda berikan saat mendaftar atau menggunakan Google Sign-In.",
      "Data penggunaan aplikasi seperti transaksi pemasukan, pengeluaran, hutang, kategori, target, dan preferensi pengingat yang Anda simpan di MoneySpender.",
      "Data teknis seperti cookie sesi login, endpoint push notification, dan log dasar yang dibutuhkan untuk menjaga keamanan aplikasi.",
    ],
  },
  {
    title: "Bagaimana data digunakan",
    items: [
      "Menyediakan fitur inti MoneySpender seperti login, dashboard laporan, pengingat, sinkronisasi data, dan pemulihan akun.",
      "Menjaga keamanan akun, mencegah penyalahgunaan, dan membantu investigasi bila ada gangguan teknis.",
      "Mengirim pengingat transaksi atau notifikasi yang memang Anda aktifkan di dalam aplikasi.",
    ],
  },
  {
    title: "Pembagian dan penyimpanan data",
    items: [
      "Data disimpan melalui infrastruktur yang mendukung aplikasi, termasuk layanan hosting, autentikasi, database, dan notifikasi.",
      "Kami tidak menjual data pribadi pengguna kepada pihak ketiga.",
      "Data hanya dibagikan sejauh diperlukan untuk menjalankan layanan, mematuhi kewajiban hukum, atau melindungi keamanan pengguna dan aplikasi.",
    ],
  },
  {
    title: "Hak pengguna",
    items: [
      "Anda dapat memperbarui informasi akun dan data penggunaan langsung dari aplikasi selama fitur terkait tersedia.",
      "Anda dapat meminta penghapusan akun atau penonaktifan akses dengan menghubungi kontak resmi yang tercantum di halaman ini.",
      "Anda dapat berhenti memakai Google Sign-In kapan saja dengan mencabut akses aplikasi dari akun Google Anda.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <PublicSiteShell
      eyebrow="Privacy Policy"
      title="Kebijakan privasi untuk pengguna MoneySpender"
      description="Halaman ini menjelaskan bagaimana MoneySpender mengumpulkan, memakai, menyimpan, dan melindungi data pengguna saat Anda mengakses aplikasi, termasuk saat login memakai email atau Google Sign-In."
    >
      <div className="grid gap-6">
        <Panel className="rounded-[32px] p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ringkasan</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              MoneySpender adalah aplikasi pencatatan keuangan pribadi. Kami memproses
              data yang diperlukan untuk autentikasi, penyimpanan catatan transaksi,
              personalisasi pengalaman, dan pengiriman pengingat yang Anda aktifkan.
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
              Untuk pertanyaan terkait privasi, permintaan penghapusan data, atau isu
              seputar penggunaan Google Sign-In, silakan hubungi:
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
