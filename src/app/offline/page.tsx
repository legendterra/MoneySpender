import Link from "next/link";

import { OfflineSnapshotViewer } from "@/components/pwa/offline-snapshot-viewer";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6">
        <div className="inline-flex w-fit rounded-md bg-accent px-4 py-2 text-sm font-bold text-white">
          Offline mode
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-normal md:text-6xl">
            Lagi offline, tapi catatanmu tidak harus berhenti.
          </h1>
          <p className="text-base leading-8 text-muted">
            Halaman yang sudah pernah dibuka akan tetap bisa muncul. Kalau kamu menambah transaksi atau hutang saat offline,
            datanya masuk antrian dulu dan akan dikirim saat koneksi balik.
          </p>
        </div>
        <OfflineSnapshotViewer />
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            Coba buka dashboard
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
            Ke halaman awal
          </Link>
        </div>
      </div>
    </main>
  );
}
