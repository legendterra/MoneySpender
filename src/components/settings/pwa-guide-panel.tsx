import { Panel } from "@/components/ui/panel";

export function PwaGuidePanel() {
  return (
    <Panel className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted">PWA</p>
        <h2 className="text-2xl font-bold text-foreground">Cara pakai offline</h2>
      </div>
      <div className="grid gap-3 text-sm leading-7 text-muted">
        <p>
          Android: buka website di Chrome, login, buka halaman penting satu kali, lalu pilih Install app atau Add to Home Screen.
        </p>
        <p>
          iPhone: buka di Safari, tap Share, pilih Add to Home Screen. Setelah itu buka dari ikon home screen.
        </p>
        <p>
          Saat offline, halaman yang sudah pernah dibuka tetap muncul. Transaksi dan hutang yang kamu tambah akan masuk antrian dan sync saat online.
        </p>
      </div>
    </Panel>
  );
}
