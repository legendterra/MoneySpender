"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, HandCoins, Plus, ReceiptText, Search, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { BerandaSkeleton, BerandaView } from "@/components/beranda/beranda-view";
import { CatatProvider, useCatat } from "@/components/quick-add/catat-provider";
import { CatatSheet } from "@/components/quick-add/catat-sheet";
import type { CatatMode } from "@/components/quick-add/types";
import { LogoMark } from "@/components/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { AmountDisplay, AmountText } from "@/components/ui/amount-display";
import { AmountKeypad } from "@/components/ui/amount-keypad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { jakartaMonthKey } from "@/components/ui/format";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ListRow, RowAvatar } from "@/components/ui/list-row";
import { MonthSwitcher } from "@/components/ui/month-switcher";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  fixtureBeranda,
  fixtureBerandaEmpty,
  fixtureBerandaOver,
  fixtureBerandaPast,
  fixtureCatatData,
} from "./fixtures";

const swatches = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["line", "bg-line"],
  ["text", "bg-text"],
  ["muted", "bg-muted"],
  ["primary", "bg-primary"],
  ["income", "bg-income"],
  ["expense", "bg-expense"],
  ["debt", "bg-debt"],
  ["transfer", "bg-transfer"],
] as const;

function GallerySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-20 gap-3">
      <h2 id={`${id}-title`} className="text-[13px] font-semibold tracking-[0.08em] text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[12px] font-medium text-muted">{children}</p>;
}

function OpenCatatButtons() {
  const { open } = useCatat();
  const modes: Array<[CatatMode, string]> = [
    ["expense", "Keluar"],
    ["income", "Masuk"],
    ["transfer", "Transfer"],
    ["debt", "Hutang"],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map(([mode, label]) => (
        <Button key={mode} variant="secondary" size="sm" onClick={() => open(mode)}>
          <Plus aria-hidden="true" />
          Buka Catat: {label}
        </Button>
      ))}
    </div>
  );
}

export function UiGallery() {
  const [segment, setSegment] = React.useState<"expense" | "income" | "transfer" | "debt">("expense");
  const [selectedChip, setSelectedChip] = React.useState("Makan & Minum");
  const [switchOn, setSwitchOn] = React.useState(true);
  const [amount, setAmount] = React.useState(25000);
  const [month, setMonth] = React.useState(jakartaMonthKey());
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <CatatProvider data={fixtureCatatData} demo>
      <div className="min-h-dvh bg-bg">
        <header className="sticky top-0 z-30 border-b border-line bg-bar backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 md:px-6">
            <LogoMark />
            <span className="hidden text-[13px] text-muted sm:inline">UI gallery</span>
            <nav aria-label="Gallery" className="ml-auto flex items-center gap-1">
              <Link
                href="/dev/ui/beranda"
                className="rounded-chip px-3 py-2 text-[13px] font-semibold text-primary-ink hover:underline"
              >
                Beranda
              </Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1120px] gap-10 px-4 py-6 md:px-6 md:py-8">
          <GallerySection id="tokens" title="Tokens">
            <Panel>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {swatches.map(([name, className]) => (
                  <div key={name} className="grid gap-1.5">
                    <div className={`h-12 rounded-control border border-line ${className}`} />
                    <span className="text-[12px] font-medium text-muted">{name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-1">
                <p className="text-[28px] font-bold tracking-tight text-text">Jatah aman hari ini</p>
                <p className="text-[17px] font-semibold text-text">Judul layar 17</p>
                <p className="text-[15px] font-semibold text-text">Judul bagian 15</p>
                <p className="text-[14px] text-text">Teks isi 14 untuk daftar transaksi dan form.</p>
                <p className="text-[13px] text-muted">Teks pendukung 13 dengan warna muted.</p>
                <p className="text-[12px] text-muted">Keterangan kecil 12</p>
              </div>
            </Panel>
          </GallerySection>

          <GallerySection id="money" title="AmountDisplay / AmountText">
            <Panel className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-4">
                <AmountDisplay value={25000} />
                <AmountDisplay value={0} placeholder />
                <AmountDisplay value={12_345_678_901_234} />
                <AmountDisplay value={3_120_000} size="lg" align="start" />
              </div>
              <div className="grid content-start gap-2 text-[15px]">
                <AmountText value={142000} className="text-[22px] font-bold" />
                <AmountText value={8_500_000} tone="income" compact sign="always" />
                <AmountText value={-5_120_000} tone="expense" compact />
                <AmountText value={-58000} tone="expense" />
                <AmountText value={200000} tone="debt" sign="always" />
                <AmountText value={100000} tone="transfer" />
              </div>
            </Panel>
          </GallerySection>

          <GallerySection id="buttons" title="Button / IconButton">
            <Panel className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button>Simpan</Button>
                <Button variant="secondary">Batal</Button>
                <Button variant="outline">Ekspor</Button>
                <Button variant="ghost">Lewati</Button>
                <Button variant="danger">
                  <Trash2 aria-hidden="true" />
                  Hapus
                </Button>
                <Button isLoading>Menyimpan</Button>
                <Button disabled>Nonaktif</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Kecil</Button>
                <Button size="md">Sedang</Button>
                <Button size="lg">
                  <Plus aria-hidden="true" />
                  Catat
                </Button>
                <IconButton label="Cari">
                  <Search aria-hidden="true" />
                </IconButton>
                <IconButton label="Notifikasi" variant="secondary">
                  <Bell aria-hidden="true" />
                </IconButton>
                <IconButton label="Tambah" variant="primary">
                  <Plus aria-hidden="true" />
                </IconButton>
                <IconButton label="Hapus" size="sm">
                  <Trash2 aria-hidden="true" />
                </IconButton>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => toast.success("Pengeluaran Rp25.000 tersimpan")}>
                  Toast sukses
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toast.error("Gagal menyimpan ke tabel transactions: new row violates row-level security policy")
                  }
                >
                  Toast gagal
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toast("Catatan dihapus", { action: { label: "Urungkan", onClick: () => undefined } })
                  }
                >
                  Toast urungkan
                </Button>
              </div>
            </Panel>
          </GallerySection>

          <GallerySection id="forms" title="Field / Input / Select / Switch">
            <Panel className="grid gap-4 md:grid-cols-2">
              <Field label="Nama dompet" hint="Contoh: BCA, GoPay, Tunai">
                <Input placeholder="Nama dompet" defaultValue="BCA" />
              </Field>
              <Field label="Saldo awal" error="Saldo awal tidak boleh kosong">
                <Input placeholder="Rp0" aria-invalid="true" />
              </Field>
              <Field label="Jenis dompet">
                <Select defaultValue="bank">
                  <option value="cash">Tunai</option>
                  <option value="bank">Rekening bank</option>
                  <option value="ewallet">Dompet digital</option>
                </Select>
              </Field>
              <Field label="Catatan" optional="opsional">
                <Textarea placeholder="Contoh: rekening gaji" />
              </Field>
              <div className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3 md:col-span-2">
                <div>
                  <p className="text-[14px] font-medium text-text">Sisihkan target tabungan dari jatah harian</p>
                  <p className="text-[12px] text-muted">Jatah harian dikurangi sisa target bulan ini.</p>
                </div>
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} label="Sisihkan target tabungan" />
              </div>
            </Panel>
          </GallerySection>

          <GallerySection id="choice" title="SegmentedControl / Chip / Badge / MonthSwitcher">
            <Panel className="grid gap-5">
              <SegmentedControl
                label="Jenis catatan"
                value={segment}
                onChange={setSegment}
                options={[
                  { value: "expense", label: "Keluar", tone: "expense" },
                  { value: "income", label: "Masuk", tone: "income" },
                  { value: "transfer", label: "Transfer", tone: "transfer" },
                  { value: "debt", label: "Hutang", tone: "debt" },
                ]}
              />
              <ChipGroup label="Kategori">
                {["Makan & Minum", "Kopi & Nongkrong", "Ojek & Taksi Online", "Belanja Dapur", "Bensin"].map((name) => (
                  <Chip variant="choice" key={name} selected={selectedChip === name} onClick={() => setSelectedChip(name)}>
                    {name}
                  </Chip>
                ))}
                <Chip variant="dashed" icon={Plus}>
                  Lainnya
                </Chip>
              </ChipGroup>
              <ChipGroup label="Detail">
                <Chip variant="meta" icon={Wallet} chevron>
                  Tunai
                </Chip>
                <Chip variant="meta" chevron>
                  Hari ini
                </Chip>
              </ChipGroup>
              <div className="flex flex-wrap gap-2">
                <Badge>Netral</Badge>
                <Badge tone="primary">Aktif</Badge>
                <Badge tone="income">Masuk</Badge>
                <Badge tone="expense">Lewat batas</Badge>
                <Badge tone="debt">Hampir habis</Badge>
                <Badge tone="transfer">Transfer</Badge>
              </div>
              <MonthSwitcher value={month} onChange={setMonth} className="justify-self-start" />
            </Panel>
          </GallerySection>

          <GallerySection id="lists" title="ListRow / SectionHeader / StatCard / ProgressBar">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <SectionHeader title="Hari ini" meta="−Rp58.000" action={{ label: "Lihat semua", href: "#lists" }} />
                <ul className="divide-y divide-line">
                  <li>
                    <ListRow
                      leading={<RowAvatar label="Makan" tone="expense" />}
                      title="Makan siang"
                      subtitle="Makan & Minum · GoPay"
                      trailing={<AmountText value={-33000} tone="expense" />}
                      onClick={() => undefined}
                    />
                  </li>
                  <li>
                    <ListRow
                      leading={<RowAvatar label="Gaji" tone="income" />}
                      title="Gaji November"
                      subtitle="Gaji · BCA"
                      trailing={<AmountText value={8_500_000} tone="income" sign="always" />}
                      trailingSub="09.12"
                    />
                  </li>
                  <li>
                    <ListRow
                      leading={<RowAvatar icon={HandCoins} tone="debt" />}
                      title="Pinjam dari Sari"
                      subtitle="Hutang · Mandiri"
                      trailing={<AmountText value={500_000} tone="debt" />}
                    />
                  </li>
                </ul>
              </Panel>
              <div className="grid content-start gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Masuk bulan ini" value={8_500_000} tone="income" icon={TrendingUp} compact />
                  <StatCard label="Keluar bulan ini" value={5_120_000} tone="expense" icon={TrendingDown} compact />
                  <StatCard label="Total aset" value={5_627_500} hint="4 dompet aktif" />
                  <StatCard label="Hutang aktif" value={1_500_000} tone="debt" hint="2 orang" />
                </div>
                <Panel className="grid gap-4">
                  <div>
                    <Label>40% primary</Label>
                    <ProgressBar value={40} label="Contoh 40 persen" />
                  </div>
                  <div>
                    <Label>86% warning</Label>
                    <ProgressBar value={86} label="Contoh 86 persen" />
                  </div>
                  <div>
                    <Label>104% over</Label>
                    <ProgressBar value={104} label="Contoh 104 persen" />
                  </div>
                  <div>
                    <Label>Savings (income tone, small)</Label>
                    <ProgressBar value={31} tone="income" size="sm" label="Contoh tabungan" />
                  </div>
                </Panel>
              </div>
            </div>
          </GallerySection>

          <GallerySection id="states" title="EmptyState / Skeleton">
            <div className="grid gap-4 md:grid-cols-2">
              <Panel padding="none">
                <EmptyState
                  icon={ReceiptText}
                  title="Belum ada catatan bulan ini"
                  body="Catatan yang kamu simpan akan muncul di sini, dikelompokkan per hari."
                  action={<Button size="sm">Catat sekarang</Button>}
                />
              </Panel>
              <Panel className="grid gap-1">
                <Skeleton className="mb-2 h-4 w-28" />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </Panel>
            </div>
          </GallerySection>

          <GallerySection id="keypad" title="AmountKeypad">
            <Panel className="mx-auto grid w-full max-w-[400px] gap-4">
              <AmountDisplay value={amount} placeholder label="Nominal" />
              <AmountKeypad value={amount} onChange={setAmount} />
            </Panel>
          </GallerySection>

          <GallerySection id="sheet" title="Sheet / Catat">
            <Panel className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
                  Buka sheet contoh
                </Button>
              </div>
              <OpenCatatButtons />
              <p className="text-[12px] text-muted">
                Tekan N untuk membuka Catat. Di galeri, simpan tidak mengirim data ke server.
              </p>
            </Panel>
            <Sheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              title="Hapus catatan ini?"
              description="Makan siang · Rp33.000"
              size="sm"
              footer={
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setSheetOpen(false)}>
                    Batal
                  </Button>
                  <Button variant="danger" onClick={() => setSheetOpen(false)}>
                    Hapus
                  </Button>
                </div>
              }
            >
              <p className="text-[14px] leading-6 text-muted">
                Catatan akan dihapus dari Riwayat dan saldo GoPay dikembalikan. Kamu masih bisa
                mengurungkan dari notifikasi setelah menghapus.
              </p>
            </Sheet>
          </GallerySection>

          <GallerySection id="catat-modes" title="Catat sheet, every mode (inline)">
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              <CatatSheet
                inline
                open
                onOpenChange={() => undefined}
                data={fixtureCatatData}
                initialMode="expense"
                demo
                layoutId="g-expense"
                preset={{ amount: 25000, categoryId: "c-kopi" }}
              />
              <CatatSheet
                inline
                open
                onOpenChange={() => undefined}
                data={fixtureCatatData}
                initialMode="income"
                demo
                layoutId="g-income"
                preset={{ amount: 8_500_000, categoryId: "c-gaji", note: "Gaji November" }}
              />
              <CatatSheet
                inline
                open
                onOpenChange={() => undefined}
                data={fixtureCatatData}
                initialMode="transfer"
                demo
                layoutId="g-transfer"
                preset={{ amount: 500_000, note: "Isi saldo" }}
              />
              <CatatSheet
                inline
                open
                onOpenChange={() => undefined}
                data={fixtureCatatData}
                initialMode="debt"
                demo
                layoutId="g-debt"
                preset={{ amount: 200_000, contact: "Budi", debtDirection: "receivable" }}
              />
              <CatatSheet
                inline
                open
                onOpenChange={() => undefined}
                data={fixtureCatatData}
                initialMode="expense"
                demo
                layoutId="g-category"
                preset={{ amount: 48_000, panel: "category" }}
              />
              <CatatSheet
                inline
                open
                onOpenChange={() => undefined}
                data={fixtureCatatData}
                initialMode="expense"
                demo
                layoutId="g-wallet"
                preset={{ amount: 0, panel: "wallet" }}
              />
            </div>
          </GallerySection>

          <GallerySection id="beranda" title="Beranda (fixture data)">
            <BerandaView {...fixtureBeranda} />
          </GallerySection>

          <GallerySection id="beranda-over" title="Beranda: over today's allowance">
            <BerandaView {...fixtureBerandaOver} />
          </GallerySection>

          <GallerySection id="beranda-empty" title="Beranda: nothing recorded today, no savings target">
            <BerandaView {...fixtureBerandaEmpty} />
          </GallerySection>

          <GallerySection id="beranda-past" title="Beranda: past month selected">
            <BerandaView {...fixtureBerandaPast} />
          </GallerySection>

          <GallerySection id="beranda-loading" title="Beranda: loading">
            <BerandaSkeleton />
          </GallerySection>
        </main>
      </div>
    </CatatProvider>
  );
}
