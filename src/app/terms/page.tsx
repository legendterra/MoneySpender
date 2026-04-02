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
      "MoneySpender disediakan untuk membantu pengguna mencatat dan memantau aktivitas keuangan pribadi.",
      "Anda bertanggung jawab atas keakuratan data yang Anda masukkan ke dalam aplikasi.",
      "Anda setuju memakai layanan secara sah dan tidak mencoba mengganggu keamanan, stabilitas, atau akses pengguna lain.",
    ],
  },
  {
    title: "Akun dan keamanan",
    items: [
      "Anda bertanggung jawab menjaga kerahasiaan akun, password, dan akses masuk melalui provider pihak ketiga seperti Google.",
      "Jika Anda merasa akun dipakai tanpa izin, segera ubah kredensial Anda dan hubungi kontak resmi yang tersedia.",
      "Kami dapat membatasi atau menghentikan akses bila ditemukan aktivitas yang melanggar hukum atau membahayakan layanan.",
    ],
  },
  {
    title: "Ketersediaan dan perubahan layanan",
    items: [
      "Kami dapat memperbarui, mengubah, atau menghentikan sebagian fitur untuk perbaikan, keamanan, atau pengembangan produk.",
      "Kami berusaha menjaga layanan tetap tersedia, namun tidak menjamin layanan bebas gangguan setiap saat.",
      "Penggunaan layanan dilakukan atas risiko pengguna sendiri, sejauh diizinkan oleh hukum yang berlaku.",
    ],
  },
  {
    title: "Data dan tanggung jawab",
    items: [
      "Hak atas data transaksi yang Anda input tetap milik Anda, tetapi Anda memberi izin kepada MoneySpender untuk memproses data tersebut agar layanan berfungsi.",
      "Anda tidak boleh memakai layanan untuk konten menyesatkan, ilegal, berbahaya, atau melanggar hak pihak lain.",
      "Jika diwajibkan secara hukum, kami dapat menangguhkan akses atau mengungkap informasi seperlunya kepada otoritas yang berwenang.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <PublicSiteShell
      eyebrow="Terms of Service"
      title="Syarat layanan untuk penggunaan MoneySpender"
      description="Dengan memakai MoneySpender, Anda menyetujui syarat penggunaan berikut. Halaman ini disediakan sebagai referensi publik untuk pengguna umum dan kebutuhan verifikasi layanan pihak ketiga."
    >
      <div className="grid gap-6">
        <Panel className="rounded-[32px] p-7 sm:p-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ringkasan</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Syarat ini mengatur penggunaan aplikasi, tanggung jawab pengguna, dan batas
              tanggung jawab layanan MoneySpender.
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
            <h2 className="text-2xl font-bold text-foreground">Kontak layanan</h2>
            <p className="text-sm leading-8 text-muted sm:text-base">
              Jika Anda punya pertanyaan tentang syarat layanan, penggunaan akun, atau
              proses verifikasi integrasi pihak ketiga, hubungi:
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
