@SOUL.md
@AGENTS.md
@SKILL.md

# MoneySpender — Project Context

## Tech Stack
- **Framework**: Next.js 16.2.2 (Turbopack, breaking changes from training data)
- **Database**: Supabase (PostgreSQL, Auth, RLS)
- **Auth**: @supabase/ssr with middleware session management
- **Styling**: Tailwind CSS v4 + shadcn/ui components + CSS variables for theming
- **State**: React hooks, server components for data, client components for interaction
- **Email**: Supabase Auth (magic link, OTP)
- **PWA**: Service worker, offline snapshot caching
- **Push**: Web Push API via `web-push` package

## Key File Locations
```
src/
├── app/
│   ├── (workspace)/          # Authenticated routes (dashboard, expenses, etc.)
│   ├── api/                   # API routes (export, import, cron, push)
│   ├── auth/                  # Auth pages
│   └── layout.tsx             # Root layout (fonts, providers)
├── components/
│   ├── ui/                    # shadcn-style base components
│   ├── dashboard/             # Dashboard-specific components
│   ├── settings/              # Settings page panels
│   └── transactions/          # Transaction list + form
├── lib/
│   ├── auth.ts                # getAuthedContext() — authenticated supabase client
│   ├── data.ts                # Data fetchers (getDashboardData, etc.)
│   ├── supabase/              # client.ts, server.ts, admin.ts, middleware.ts
│   ├── import-transactions.ts # Import parsing logic
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # formatCurrency, cn, etc.
└── components/providers/       # ThemeProvider, AppProviders
```

## Important Patterns

### Auth Flow
```
User request → middleware.ts (updateSession) → createServerClient via @supabase/ssr
                                                      ↓
                                              AppShell (server component)
                                                      ↓
                                              createServerSupabaseClient()
```

### Data Fetching Rules
1. Always use `Promise.all()` for parallel queries — never sequential fetches
2. For wallet balance: need ALL transactions (fetch in parallel with other queries)
3. `React.cache()` available but use sparingly
4. `getAuthedContext()` returns `{ supabase, user }` — use this instead of manual client creation

### Theme System
CSS variables in `globals.css`:
- `--accent`, `--accent-soft`, `--accent-strong` — primary action color
- `--danger`, `--warning`, `--muted`, `--foreground`, `--background`
- Dark mode: `data-theme="dark"` on `<html>`

### Known Issues & Fixes
- `lender_name` column removed — use `contact_name` in `debts` table
- `swcMinify` deprecated in Next.js 16 — not in next.config.ts
- ExcelJS: no duplicate property names in object literals

## API Routes
- `GET /api/export/transactions` — full export XLSX with summary + detail + stats sheets
- `GET /api/export/template` — Excel template with import guide
- `POST /api/import/transactions` — CSV/XLSX import with preview
- `GET/POST /api/push/*` — push notification subscription management
- `/api/cron/*` — scheduled jobs (reminders, budget alerts, recurring transactions)

## Build & Deploy
- `npm run build` — Vercel build command
- `vercel.json` — cron job schedules (UTC)
- Environment: `.env.local` for local, Vercel env vars for production
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` required

## Design Guidelines
- Dark mode first, light mode second
- No emoji in UI elements
- Use Lucide React icons
- Panel component for card-like sections
- Mobile-first responsive design
- Bottom nav on mobile, top nav on desktop