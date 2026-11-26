import { getAuthedContext } from "@/lib/auth";
import { todayWIB } from "@/lib/dates";
import { balancesFromSnapshot, fetchFinanceSnapshot } from "@/lib/finance-data";
import { computeNetWorth, orderWallets, recentTransfers } from "@/lib/net-worth";

export type WalletsPageData = Awaited<ReturnType<typeof getWalletsPageData>>;

/** Dompet screen: every wallet with its computed balance (PLAN.md 4.2), net worth, recent transfers. */
export async function getWalletsPageData() {
  const { supabase, user } = await getAuthedContext();
  const snapshot = await fetchFinanceSnapshot(supabase, user.id, { includeArchivedWallets: true });
  const wallets = orderWallets(balancesFromSnapshot(snapshot));

  return {
    today: todayWIB(),
    wallets,
    summary: computeNetWorth(wallets, snapshot.debts),
    transfers: recentTransfers(snapshot.transfers, wallets),
    transferCount: snapshot.transfers.length,
  };
}
