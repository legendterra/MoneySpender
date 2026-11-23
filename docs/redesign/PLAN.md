# MoneySpender v2 — Redesign, Bug Fixes and QA Plan

Approved by the owner on 2026-11-20. This file is the single source of truth for everyone working
on branch `redesign/v2`. Visual direction: `docs/redesign/mockup.html` (open it in a browser).

## 1. Goals

- A personal daily money journal that is actually used every day: recording a transaction takes
  at most 3 taps, and the home screen answers "how much can I safely spend today?".
- One codebase (this Next.js app) for every platform: web, Android (Chrome "Install app" PWA, or
  a TWA wrapper later) and iPhone (Safari "Add to Home Screen" PWA). Same features, same design.
- Fix every bug from the 2026-11-20 audit (section 6).
- Personal use: no paywall, no marketing landing page.

## 2. Decisions (final)

| Topic | Decision |
|---|---|
| Schema drift | Option A: remove `payment_method`, `lender_name` and the `debt` category type from the code. The live DB is the "full recreate" schema (`supabase/schema.sql`). |
| DB changes | Only the additive migration in section 5. Never drop/alter existing columns or data. |
| Platforms | PWA everywhere. Archive the native Kotlin `Android/` project and `capacitor.config.ts` (move to `archive/`, remove Capacitor deps). |
| Billing | Off. `billingEnabled()` returns true only when `BILLING_ENABLED === "true"` (unset everywhere), so every feature is open. Remove pricing page, upgrade buttons and paywall UI; keep `lib/billing.ts`/`lib/lemonsqueezy.ts` and the webhook route dormant. |
| Landing | `/` redirects to `/dashboard` (unauthenticated users end on `/auth`). Keep `/privacy`, `/terms`, `/offline`, `/reset-password`. |
| Language | Default `id`. The choice is saved per account in `profiles.locale` and mirrored to the `locale` cookie (used by `src/i18n/request.ts`). On every authenticated load, if the cookie differs from the profile, the client sets the cookie and refreshes. Pre-login pages use the cookie or `id`. Push texts use the profile locale. |
| Hourly cron | Cloudflare Worker cron `0 * * * *` (folder `workers/digest-cron/`) calls `GET /api/cron/digest` with `Authorization: Bearer <CRON_SECRET>`. Vercel Hobby only allows daily crons. Keep the daily Vercel cron for `/api/cron/recurring`; remove the reminder and budget-alert crons from `vercel.json` (merged into digest). |
| Timezone | All "today/this month" logic uses `Asia/Jakarta` (`APP_TIMEZONE`) explicitly, never the server's local time and never `toISOString().slice(0, 10)`. Add one helper module (`src/lib/dates.ts`) and use it everywhere. |

## 3. Design system

Direction: calm, dense-enough, mobile-first daily tool. Dark mode first, light mode equal quality.
Neutral base, one action color (lime), semantic colors only on money meaning. No gradients, no
blobs, no cards inside cards, no emoji in UI.

**Owner rule (2026-11-23): minimal and flat, NO cards.** No bordered or filled boxes around
sections, lists or numbers (hero, wallets, budgets, settings, debts, reports). Structure comes
from typography, whitespace and thin 1px dividers between rows only. Section switching uses
simple text tabs with an underline indicator (no pill/segmented boxes, no card tabs). Lists are
plain rows separated by dividers. Sheets/dialogs, inputs, buttons and the keypad keep their own
surfaces; everything else sits directly on the page background.

### Tokens (CSS variables in `src/app/globals.css`, exposed through Tailwind 4 `@theme inline`)

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0e1012` | `#f5f6f3` |
| `--surface` | `#16191d` | `#ffffff` |
| `--surface-2` | `#1e2227` | `#eef0ec` |
| `--line` | `#262b31` | `#e1e4de` |
| `--text` | `#eceff3` | `#121417` |
| `--muted` | `#8a919c` | `#5d646e` |
| `--primary` (buttons, FAB, focus) | `#c8f169` | `#c8f169` |
| `--on-primary` | `#0e1012` | `#0e1012` |
| `--income` | `#3dd68c` | `#0a7a52` |
| `--expense` | `#ff7a6b` | `#c4332a` |
| `--debt` | `#f5b544` | `#a85a00` |
| `--transfer` | `#6ca8ff` | `#1f55c9` |

Text on surfaces must pass WCAG AA (4.5:1). Lime is never used as text on light backgrounds.

- Font: Plus Jakarta Sans (already loaded in `layout.tsx`). Amounts use `font-variant-numeric: tabular-nums`.
- Radius: 10 (chips/inputs), 14 (buttons/rows), 22 (sheets/hero). Spacing scale 4/8/12/16/24/32.
- Touch targets >= 44px. Respect `env(safe-area-inset-*)`. `prefers-reduced-motion` disables motion.
- Motion (framer-motion, already a dependency): sheet slide-up spring, list item enter/exit, number
  tick on amount changes. Nothing decorative.
- Money format: `Rp142.000` full, `Rp8,5 jt` compact (id locale); en locale uses `IDR 142,000` / `IDR 8.5M`.

### Components (`src/components/ui/`, rewrite in place; keep file names where they exist)

Button (primary/secondary/ghost/danger, sizes), IconButton, Input, AmountKeypad (digits, `000`,
backspace, max 14 digits, emits integer rupiah), AmountDisplay, Sheet (bottom sheet on mobile,
centered dialog >= 768px; focus trap; Esc and swipe-down close), SegmentedControl, Chip/ChipGroup,
ListRow, SectionHeader, StatCard, ProgressBar, EmptyState, Skeleton, Toast (keep `sonner`), Switch,
Select, Field (label + error), MonthSwitcher, Badge.

A UI gallery route `src/app/dev/ui/page.tsx` renders every component and every screen with fixture
data. It returns `notFound()` unless `process.env.NEXT_PUBLIC_UI_GALLERY === "1"`. Visual tests use it.

## 4. Information architecture and screens

App shell: mobile (< 1024px) = top bar (title, month switcher where relevant) + bottom tab bar
`Beranda | Riwayat | (+) | Hutang | Lainnya`. Desktop (>= 1024px) = left sidebar with the same
destinations plus the "Lainnya" items expanded, and a "Catat" primary button; keyboard shortcut `N`
opens Catat. Every non-root screen has a visible back button (iPhone PWAs have no back gesture).

| Route | Screen | Content |
|---|---|---|
| `/dashboard` | Beranda | Greeting + month switcher; hero "Jatah aman hari ini" (section 4.1) with used/remaining and progress; month income/expense; wallet chips with balances; "Hari ini" list with day total; budgets near/over limit; savings target progress (only if set). |
| Catat (global sheet) | Quick add | Segmented Keluar / Masuk / Transfer / Hutang. Amount via AmountKeypad. Category chips (most used first, then "+ Lainnya" to search/create). Wallet chip (last used), date chip (default today WIB), note. Templates row (one tap fills amount+category+wallet). Save. Offline: queued with wallet kept. |
| `/history` | Riwayat | Grouped by day with day totals; search; filter chips (type, wallet, category, month/year); tap row = edit sheet (edit, duplicate, delete with undo toast). Includes income, expense, transfers, debts and debt payments. |
| `/debts` | Hutang | Tabs Hutang (payable) / Piutang (receivable); totals; each item: contact, remaining, progress, payments; actions: bayar sebagian (choose wallet), lunas, edit, delete. |
| `/wallets` | Dompet | Wallet list with balances, add/edit/archive, transfer between wallets, total assets, net worth (wallets + receivables - payables). |
| `/budget` | Budget | Monthly budget per expense category with spent/limit bars; copy last month's budgets. |
| `/reports` | Laporan | Month/year: income vs expense trend, category breakdown, top merchants, export button. |
| `/settings` | Lainnya / Pengaturan | Profile, language, theme, savings target (+ "Sisihkan target tabungan dari jatah harian" toggle), categories, recurring transactions, templates, notifications, data (export/import), install guide, account (logout, delete). |
| `/onboarding` | Onboarding | 3 steps: first wallet + opening balance, savings target (optional, default 0), enable notifications (button triggers the permission prompt). |
| `/auth` | Login | Email/password, magic link, Google. |

Old routes redirect permanently (in `next.config.ts`): `/expenses` and `/income` and
`/all-transactions` -> `/history`, `/net-worth` -> `/wallets`, `/goals` -> `/settings`,
`/pricing` -> `/dashboard`.

### 4.1 Daily safe-to-spend ("Jatah aman hari ini")

Computed server-side in `src/lib/allowance.ts` (pure function, unit tested), all dates in WIB:

```
liquid           = sum of balances of non-archived wallets with kind != 'card', as of the start of today
upcomingRecurring = sum of active recurring EXPENSE rules whose day_of_month >= today and not yet generated this month
reserve          = profile.reserve_savings ? max(0, monthly_savings_goal - savedThisMonth) : 0
savedThisMonth   = max(0, incomeThisMonth - expenseThisMonth)   (before today)
daysLeft         = days remaining in the month including today
allowanceToday   = max(0, floor((liquid - upcomingRecurring - reserve) / daysLeft))
spentToday       = expenses recorded today (any wallet, excluding transfers)
remainingToday   = allowanceToday - spentToday   (negative = over)
tomorrowAllowance = max(0, floor((liquid - spentToday - upcomingRecurring - reserve) / (daysLeft - 1)))   (daysLeft > 1)
```

### 4.2 Wallet balance

`balance = opening_balance + income - expense + transfers_in - transfers_out`
`+ payable debts received into the wallet - receivable debts paid out of the wallet`
`- payments of payable debts from the wallet + payments of receivable debts into the wallet`.
A debt payment with `wallet_id` null counts against the debt's own `wallet_id`. One pure function
(`computeWalletBalances` in `src/lib/balances.ts`) used by every page, unit tested.

## 5. Migration (additive only)

File: `supabase/migrations/2026-11-20-v2-preferences.sql`, idempotent (`if not exists`, `DO` blocks
for constraints and policies). The owner runs it in the Supabase SQL Editor.

- `profiles.locale text not null default 'id'` with check `locale in ('id','en')`.
- `profiles.reserve_savings boolean not null default false`.
- `reminder_preferences.digest_enabled boolean not null default true`.
- `reminder_preferences.digest_every_hours integer not null default 3` check `in (0,2,3,4)` (0 = three times a day: active_start, midpoint, active_end).
- `reminder_preferences.active_start integer not null default 9`, `active_end integer not null default 21` (0-23, start < end).
- `reminder_preferences.hide_amounts boolean not null default false`.
- New table `notification_digest_logs (id uuid pk, user_id uuid fk auth.users on delete cascade, endpoint text not null, local_date date not null, local_hour integer not null, kind text not null, created_at timestamptz default now(), unique (endpoint, local_date, local_hour))`, RLS on, owner select policy.
- New table `transaction_templates (id uuid pk, user_id fk, label text, type transaction_type, amount numeric(14,2) > 0, category_id fk set null, category_label text, wallet_id fk set null, wallet_label text, sort_order int default 0, created_at)`, RLS owner-only for all.
- `notify pgrst, 'reload schema';`

Also update `supabase/schema.sql` so a fresh install equals the live DB plus this migration, and move
its destructive DROP block into a separate `supabase/reset-DANGER.sql` with a warning header.

## 6. Bug fixes from the audit (all must have a regression test where testable)

1. Remove `payment_method` everywhere (`lib/data.ts`, `lib/types.ts`, transactions list/form, recurring settings, cron recurring, dashboard top transactions).
2. Remove `lender_name` everywhere (`lib/data.ts` selects and `mapDebt`, `debt-form`, `debts-list`).
3. Remove the `debt` category type: `TransactionType` = `income | expense`; no debt categories in `ensureUserSetup`; debt `category_label` is `Hutang` / `Piutang`; import maps debt rows without categories.
4. `lib/data.ts`: never swallow query errors. Every query result goes through one helper that throws an error naming the table and the Supabase message (shown by `error.tsx`), so schema drift is visible.
5. `app/auth/callback/route.ts`: open redirect. Accept `next` only if `new URL(next, origin).origin === origin` (covers `/%09/evil.com`, backslashes, encoded slashes).
6. Budget month ranges use the real last day of the month (no `-31`).
7. Offline queue keeps `wallet_id`/`wallet_label`; a permanently failing item is shown to the user with the Supabase error and can be retried or discarded.
8. Wallet balances include debts and debt payments (section 4.2); debt payments store `wallet_id`/`wallet_label`; partial payment never stores more than the remaining amount; write debt update + payment consistently (payment first, then debt; on failure roll back the payment and show the error).
9. Settings lists real recurring transactions (currently hardcoded `[]`).
10. Cron recurring: copy `wallet_id`/`wallet_label`; idempotent per rule and month (update `last_generated_month` with a conditional update before inserting, or check existing generated transaction) so a double run cannot duplicate.
11. Timezone: `toMonthInput`/today helpers in WIB; debt `paid_date` and recurring dates in WIB.
12. Push subscribe/unsubscribe: invalid JSON returns 400.
13. Account delete: sign out through Supabase (`supabase.auth.signOut()` server-side) instead of deleting wrong cookie names; delete the user's files in the `receipts` bucket with the admin client.
14. Lint: zero warnings.
15. Custom 404 page in the new design; install prompt hidden on 404/auth/offline pages.

## 7. Notifications ("digest")

Endpoint `GET /api/cron/digest` (Node runtime, Bearer `CRON_SECRET`, `?dry=1` returns the plan as JSON without sending or logging). Runs hourly. For the current WIB hour:

- Eligible users: `reminder_preferences.push_enabled = true`, `digest_enabled = true`, have push subscriptions, and the hour is one of their slots: `active_start, active_start + N, ...` up to and including `active_end` (N = `digest_every_hours`; N = 0 means `active_start`, `round((start+end)/2)`, `active_end`). No push outside `[active_start, active_end]`.
- Message by slot (texts in the profile locale, amounts hidden when `hide_amounts`):
  - first slot: morning brief — allowance today and money left for the rest of the month;
  - middle slots: remaining today and spent so far; if no transaction recorded today and hour >= 12: "no records yet today" reminder instead;
  - last slot: daily recap — spent vs allowance and tomorrow's allowance;
  - any slot when `remainingToday < 0`: over-allowance text with tomorrow's adjusted allowance.
- Budget alerts (80% / 100% per category, deduplicated by `budget_notification_logs`) are evaluated on every run but only sent inside the user's active window.
- Dedup per device: insert into `notification_digest_logs` (unique endpoint/date/hour) before sending; 404/410 responses delete the subscription.
- Notification click opens `/dashboard`. `public/sw.js` handles `push` and `notificationclick`.
- Replaces `/api/cron/reminder/[slot]` and `/api/cron/budget-alerts` (delete those routes and their crons).
- Settings > Notifikasi: master switch (asks permission and subscribes), digest on/off, interval (2/3/4 hours or three times a day), active hours, hide amounts on lock screen, budget alerts on/off, "send a test notification" button (POST `/api/push/test`, rate limited, sends to the current user's devices only).
- Worker: `workers/digest-cron/` (`wrangler.toml` with `[triggers] crons = ["0 * * * *"]`, `src/index.ts` fetches `${APP_URL}/api/cron/digest`, secrets `CRON_SECRET`, var `APP_URL = "https://money.moneyspender.net"`).

## 8. Platforms

- PWA: manifest (name, short_name, icons incl. maskable, theme/background colors from tokens, `display: standalone`, shortcuts "Catat pengeluaran" `/dashboard?catat=expense`, "Riwayat" `/history`), iOS meta tags (`apple-mobile-web-app-capable`, status bar style, splash/apple-touch-icon), service worker offline shell + offline queue sync on reconnect.
- Install guide page inside Settings with Android (Chrome menu > Install app) and iPhone (Safari share > Add to Home Screen) steps, and a note that iPhone notifications need iOS 16.4+ and the installed app.
- Haptics via `navigator.vibrate` where supported (Android); silently skipped on iOS.
- Archive: move `Android/` and `capacitor.config.ts` to `archive/` with a README saying why; remove `@capacitor/*` dependencies.

## 9. QA plan

All automated runs are headless and sequential (the owner uses the laptop meanwhile). Never open
visible browser windows, never steal focus.

| Layer | Scope | Tool | Gate |
|---|---|---|---|
| Static | `npm run typecheck`, `npm run lint` (0 errors, 0 warnings), `npm run build` | npm | must pass |
| Unit | money format/parse, WIB date helpers (month boundaries, 00:00-06:59 WIB), wallet balances (transactions, transfers, debts, payments, null payment wallet), allowance (incl. over-spend, last day of month, reserve on/off), budget ratio, digest slot selection (intervals 0/2/3/4, active window, quiet hours, day rollover) and message choice (each variant, hidden amounts, id/en), recurring idempotency, import parser, redirect guard | vitest | must pass |
| Schema | `scripts/check-schema.mjs`: every table/column the code selects or writes exists in the live DB (anon key, `limit=0` probes); also run in CI | node | must pass |
| E2E | flows in 9.1 on three projects: Desktop Chrome 1440x900, Pixel 7, iPhone 14 (WebKit) | Playwright | must pass |
| Visual | `/dev/ui` gallery + main screens, dark and light, three viewports; baseline committed after the owner approves | Playwright screenshots | reviewed |
| A11y | every main screen | `@axe-core/playwright` | 0 serious/critical |
| Perf | `/dashboard` and `/history` mobile | Lighthouse CLI | perf >= 90, a11y >= 95 |

### 9.1 E2E flows (dedicated QA account, deleted afterwards)

1. Login -> onboarding (wallet "Tunai" Rp500.000, savings target 0) -> lands on Beranda.
2. Catat expense Rp25.000 "Kopi" from Tunai via keypad -> visible in Beranda "Hari ini", in Riwayat, Tunai balance Rp475.000, allowance updated. Edit to Rp30.000, duplicate, delete with undo.
3. Catat income, transfer between two wallets -> balances correct.
4. Payable debt Rp200.000 into BCA -> BCA +200.000; partial payment Rp50.000 from BCA -> BCA -50.000, remaining 150.000; pay off -> lunas, no overpayment stored.
5. Budget for "Makan" -> spend to 80% and 100% -> warning/over badges.
6. Recurring expense rule -> call `/api/cron/recurring` twice -> exactly one transaction with the wallet.
7. Export xlsx -> file downloads and opens with ExcelJS; import a CSV preview then commit.
8. Offline (context.setOffline) -> catat -> back online -> synced with the wallet.
9. Language EN -> logout -> login in a fresh browser context -> still EN; a brand-new account starts in ID.
10. Notifications settings saved; `/api/cron/digest?dry=1` returns the expected slots/messages for the QA user at a mocked hour.
11. Theme toggle, logout.

### 9.2 Manual on the owner's phones (checklist delivered as `docs/redesign/QA-DEVICE-CHECKLIST.md`)

Install on Android and iPhone, notification arrives (the worker is triggered manually), hide-amounts
mode, quiet hours respected, offline record, keyboard never covers the amount, safe areas around the
notch, one-hand reach of the + button, back buttons everywhere.

### 9.3 Exit criteria

No open critical/high bugs; all gates in section 9 pass; per-wallet balance difference (old formula
vs new) reported to the owner before release; owner approves on his phones; then merge to `betav1`
(production).

## 10. Working rules for contributors (humans and agents)

- Branch work happens on `redesign/v2-*` branches merged into `redesign/v2`; never push to `betav1`.
- Conventional commits, explicit paths when staging, no attribution lines.
- Never print, log or commit secrets; `.env*` files are gitignored.
- Never run DDL or destructive queries against Supabase. Read-only probes only.
- Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` when unsure (`proxy.ts` replaces middleware, async `params`/`cookies()`).
- Only new dependency allowed without asking: `@axe-core/playwright` (dev). Removing `@capacitor/*` is approved.
- Keep components small, match the existing code style, comments only where the code is not obvious.
