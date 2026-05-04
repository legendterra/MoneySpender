import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "src/app/(workspace)/net-worth/page.tsx",
  "src/app/api/cron/recurring/route.ts",
  "src/app/api/cron/budget-alerts/route.ts",
  "src/app/api/import/transactions/route.ts",
  "src/components/net-worth/transfer-panel.tsx",
  "src/components/pwa/offline-snapshot-viewer.tsx",
  "public/sw.js",
];

const requiredSchemaTerms = [
  "public.wallet_transfers",
  "public.transaction_splits",
  "public.budget_notification_logs",
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
