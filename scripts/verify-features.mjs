import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/app/(workspace)/dashboard/page.tsx",
  "src/app/(workspace)/history/page.tsx",
  "src/app/(workspace)/wallets/page.tsx",
  "src/app/(workspace)/debts/page.tsx",
  "src/app/(workspace)/budget/page.tsx",
  "src/app/(workspace)/reports/page.tsx",
  "src/app/(workspace)/settings/page.tsx",
  "src/app/(workspace)/settings/[section]/page.tsx",
  "src/app/install/page.tsx",
  "src/app/api/cron/recurring/route.ts",
  "src/app/api/cron/digest/route.ts",
  "src/app/api/import/transactions/route.ts",
  "src/components/dompet/dompet-view.tsx",
  "src/components/hutang/hutang-view.tsx",
  "src/components/riwayat/riwayat-view.tsx",
  "src/components/pwa/offline-snapshot-viewer.tsx",
  "public/sw.js",
];

const requiredSchemaTerms = [
  "public.wallet_transfers",
  "public.transaction_splits",
  "public.budget_notification_logs",
  "public.notification_digest_logs",
  "public.transaction_templates",
  "storage.buckets",
  "last_generated_month",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(join(root, file)));
const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
const missingSchema = requiredSchemaTerms.filter((term) => !schema.includes(term));

if (missingFiles.length || missingSchema.length) {
  console.error("Feature verification failed.");
  if (missingFiles.length) console.error("Missing files:", missingFiles.join(", "));
  if (missingSchema.length) console.error("Missing schema terms:", missingSchema.join(", "));
  process.exit(1);
}

console.log("Feature verification passed.");
