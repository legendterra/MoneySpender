import type { BerandaViewProps } from "@/components/beranda/beranda-view";
import type { CatatData } from "@/components/quick-add/types";

/** Realistic Indonesian fixture data for the UI gallery (no real user data). */

export const fixtureUser = { label: "Raihan Pratama", email: "raihan.pratama@contoh.id" };

export const fixtureCatatData: CatatData = {
  wallets: [
    { id: "w-bca", name: "BCA", kind: "bank" },
    { id: "w-gopay", name: "GoPay", kind: "ewallet" },
    { id: "w-tunai", name: "Tunai", kind: "cash" },
    { id: "w-mandiri", name: "Mandiri", kind: "bank" },
  ],
  categories: [
    { id: "c-makan", name: "Makan & Minum", type: "expense", color: "#f97316", usageCount: 42 },
    { id: "c-kopi", name: "Kopi & Nongkrong", type: "expense", color: "#78350f", usageCount: 31 },
    { id: "c-ojek", name: "Ojek & Taksi Online", type: "expense", color: "#334155", usageCount: 18 },
    { id: "c-dapur", name: "Belanja Dapur", type: "expense", color: "#fb923c", usageCount: 12 },
    { id: "c-bensin", name: "Bensin", type: "expense", color: "#64748b", usageCount: 9 },
    { id: "c-pulsa", name: "Pulsa & Paket Data", type: "expense", color: "#d97706", usageCount: 6 },
    { id: "c-parkir", name: "Parkir & Tol", type: "expense", color: "#475569", usageCount: 5 },
    { id: "c-hiburan", name: "Hiburan & Nonton", type: "expense", color: "#7c3aed", usageCount: 4 },
    { id: "c-listrik", name: "Listrik & Air", type: "expense", color: "#eab308", usageCount: 3 },
    { id: "c-sehat", name: "Kesehatan & Obat", type: "expense", color: "#10b981", usageCount: 2 },
    { id: "c-kos", name: "Kos / Sewa Rumah", type: "expense", color: "#ef4444", usageCount: 1 },
    { id: "c-lain-out", name: "Lainnya", type: "expense", color: "#6b7280", usageCount: 1 },
    { id: "c-gaji", name: "Gaji", type: "income", color: "#3b82f6", usageCount: 5 },
    { id: "c-freelance", name: "Freelance / Proyek", type: "income", color: "#6366f1", usageCount: 2 },
    { id: "c-cashback", name: "Cashback & Reward", type: "income", color: "#22c55e", usageCount: 3 },
    { id: "c-bonus", name: "Bonus & THR", type: "income", color: "#8b5cf6", usageCount: 0 },
    { id: "c-transfer-in", name: "Transfer Masuk", type: "income", color: "#f59e0b", usageCount: 1 },
    { id: "c-lain-in", name: "Lainnya", type: "income", color: "#6b7280", usageCount: 0 },
  ],
  templates: [
    {
      id: "t-kopi",
      label: "Kopi pagi",
      type: "expense",
      amount: 25000,
      categoryId: "c-kopi",
      categoryLabel: "Kopi & Nongkrong",
      walletId: "w-tunai",
      walletLabel: "Tunai",
    },
    {
      id: "t-makan",
      label: "Makan siang",
      type: "expense",
      amount: 35000,
      categoryId: "c-makan",
      categoryLabel: "Makan & Minum",
      walletId: "w-gopay",
      walletLabel: "GoPay",
    },
    {
      id: "t-ojek",
      label: "Ojek ke kantor",
      type: "expense",
      amount: 18000,
      categoryId: "c-ojek",
      categoryLabel: "Ojek & Taksi Online",
      walletId: "w-gopay",
      walletLabel: "GoPay",
    },
  ],
  contacts: ["Budi", "Sari", "Dimas Anggara"],
};

export const fixtureWallets: BerandaViewProps["wallets"] = [
  { id: "w-bca", name: "BCA", kind: "bank", balance: 3_120_000 },
  { id: "w-gopay", name: "GoPay", kind: "ewallet", balance: 412_500 },
  { id: "w-tunai", name: "Tunai", kind: "cash", balance: 250_000 },
  { id: "w-mandiri", name: "Mandiri", kind: "bank", balance: 1_845_000 },
];

export const fixtureBeranda: BerandaViewProps = {
  allowance: {
    allowanceToday: 200_000,
    spentToday: 58_000,
    remainingToday: 142_000,
    tomorrowAllowance: 205_800,
    daysLeft: 11,
  },
  month: { label: "November 2026", income: 8_500_000, expense: 5_120_000 },
  wallets: fixtureWallets,
  today: {
    spentTotal: 58_000,
    items: [
      {
        id: "i1",
        kind: "expense",
        flow: "out",
        title: "Makan siang",
        subtitle: "Makan & Minum · GoPay",
        amount: 33_000,
      },
      {
        id: "i2",
        kind: "expense",
        flow: "out",
        title: "Kopi susu",
        subtitle: "Kopi & Nongkrong · Tunai",
        amount: 25_000,
      },
      {
        id: "i3",
        kind: "debt",
        flow: "in",
        title: "Budi bayar cicilan",
        subtitle: "Piutang · BCA",
        amount: 200_000,
      },
      {
        id: "i4",
        kind: "transfer",
        flow: "move",
        title: "Transfer BCA ke GoPay",
        subtitle: "Isi saldo",
        amount: 100_000,
      },
    ],
  },
  budgets: [
    { categoryId: "c-kopi", categoryName: "Kopi & Nongkrong", spent: 416_000, budget: 400_000, ratio: 104, status: "over" },
    { categoryId: "c-makan", categoryName: "Makan & Minum", spent: 1_290_000, budget: 1_500_000, ratio: 86, status: "warning" },
    { categoryId: "c-ojek", categoryName: "Ojek & Taksi Online", spent: 180_000, budget: 450_000, ratio: 40, status: "safe" },
  ],
  savings: { saved: 1_250_000, goal: 4_000_000 },
};

export const fixtureBerandaOver: BerandaViewProps = {
  ...fixtureBeranda,
  allowance: {
    allowanceToday: 200_000,
    spentToday: 236_000,
    remainingToday: -36_000,
    tomorrowAllowance: 186_400,
    daysLeft: 11,
  },
  today: {
    spentTotal: 236_000,
    items: [
      {
        id: "o1",
        kind: "expense",
        flow: "out",
        title: "Servis motor",
        subtitle: "Lainnya · BCA",
        amount: 178_000,
      },
      ...fixtureBeranda.today.items.slice(0, 2),
    ],
  },
};

export const fixtureBerandaEmpty: BerandaViewProps = {
  ...fixtureBeranda,
  allowance: {
    allowanceToday: 210_000,
    spentToday: 0,
    remainingToday: 210_000,
    tomorrowAllowance: 210_000,
    daysLeft: 11,
  },
  today: { items: [], spentTotal: 0 },
  budgets: [
    { categoryId: "c-makan", categoryName: "Makan & Minum", spent: 600_000, budget: 1_500_000, ratio: 40, status: "safe" },
  ],
  savings: null,
};

export const fixtureBerandaPast: BerandaViewProps = {
  ...fixtureBeranda,
  allowance: null,
  month: { label: "Oktober 2026", income: 9_250_000, expense: 7_840_000 },
};
