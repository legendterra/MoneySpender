export const APP_NAME = "MoneySpender";
export const APP_DESCRIPTION =
  "Tempat simpel buat nyatet uang masuk, uang keluar, hutang, dan target bulanan.";
export const DEFAULT_CURRENCY = "IDR";
export const APP_TIMEZONE = "Asia/Jakarta";
export const MORNING_SLOT_HOUR = 7;
export const EVENING_SLOT_HOUR = 19;
export const MONTHS_TO_SHOW = 6;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/net-worth", label: "Net Worth" },
  { href: "/all-transactions", label: "Riwayat" },
  { href: "/income", label: "Pemasukan" },
  { href: "/expenses", label: "Pengeluaran" },
  { href: "/debts", label: "Hutang" },
  { href: "/settings", label: "Atur" },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Gaji",
  "Freelance",
  "Bonus",
  "Investasi",
  "Penjualan",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Makan",
  "Transport",
  "Tagihan",
  "Belanja",
  "Keluarga",
  "Hiburan",
];

export const DEFAULT_DEBT_CATEGORIES = ["Utang"];

export const WEEKDAY_OPTIONS = [
  { value: "all", label: "Semua Hari" },
  { value: "0", label: "Minggu" },
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
];
