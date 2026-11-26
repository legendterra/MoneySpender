export type CatatMode = "expense" | "income" | "transfer" | "debt";

export const CATAT_MODES: CatatMode[] = ["expense", "income", "transfer", "debt"];

export function parseCatatMode(value: string | null | undefined): CatatMode | null {
  return CATAT_MODES.includes(value as CatatMode) ? (value as CatatMode) : null;
}

export type CatatCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string | null;
  /** How often it was used recently; higher shows first. */
  usageCount?: number;
};

export type CatatWallet = {
  id: string;
  name: string;
  kind: "cash" | "bank" | "ewallet" | "card" | "other";
};

export type CatatTemplate = {
  id: string;
  label: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string | null;
  categoryLabel: string | null;
  walletId: string | null;
  walletLabel: string | null;
};

/** Everything the global Catat sheet needs, loaded once by the (workspace) layout. */
export type CatatData = {
  categories: CatatCategory[];
  wallets: CatatWallet[];
  templates: CatatTemplate[];
  /** Recent debt contact names, most recent first. */
  contacts: string[];
};

export const EMPTY_CATAT_DATA: CatatData = { categories: [], wallets: [], templates: [], contacts: [] };

export type CatatPanel = "keypad" | "category" | "wallet" | "toWallet" | "date" | "note" | "contact";

/** Initial values of the sheet (duplicate, edit, PWA shortcuts, gallery). */
export type CatatPreset = Partial<{
  amount: number;
  categoryId: string;
  /** Used when the category is only a label (no row in `categories`). */
  categoryLabel: string;
  walletId: string;
  /** Shown if the wallet is archived and therefore not in the picker. */
  walletLabel: string;
  toWalletId: string;
  toWalletLabel: string;
  dateKey: string;
  note: string;
  contact: string;
  debtDirection: "payable" | "receivable";
  panel: CatatPanel;
}>;

/** Edit mode: the sheet updates this row instead of inserting a new one. */
export type CatatEditing = {
  table: "transactions" | "wallet_transfers" | "debts";
  id: string;
  /** Debts: already paid back; the amount cannot go below it and the direction is locked. */
  debtPaid?: number;
  debtPaidAt?: string | null;
};

export type CatatOpenOptions = { preset?: CatatPreset; editing?: CatatEditing };

/** Modes an edited row may switch between (a row never moves to another table). */
export function editableModes(editing: CatatEditing | null | undefined): CatatMode[] {
  if (!editing) return CATAT_MODES;
  if (editing.table === "transactions") return ["expense", "income"];
  if (editing.table === "wallet_transfers") return ["transfer"];
  return ["debt"];
}
