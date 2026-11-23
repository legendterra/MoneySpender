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
