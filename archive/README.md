# Archive: retired native wrappers

These files are kept for reference only. Nothing here is built, linted, type-checked or
deployed (`archive/` is excluded in `tsconfig.json` and `eslint.config.mjs`).

| Path | What it was | Why it is retired |
|---|---|---|
| `Android/` | Native Kotlin Android project (WebView wrapper around the web app). | Replaced by the PWA: Chrome on Android installs it as a WebAPK ("Instal aplikasi"), with push notifications, offline shell and home-screen shortcuts. One codebase, no Play Store build to maintain. |
| `capacitor.config.ts` | Capacitor iOS wrapper config (remote mode, loading the production site). | Replaced by the PWA on iPhone: Safari > Share > "Tambahkan ke Layar Utama". Web push works on iOS 16.4+ for the installed app. A native iOS build would also need a Mac, Xcode and a paid Apple Developer account. |

The `@capacitor/core`, `@capacitor/ios` and `@capacitor/cli` packages were removed from
`package.json` at the same time (docs/redesign/PLAN.md, sections 2 and 8).

If a store listing is ever needed again, prefer a Trusted Web Activity (Android) that wraps the
same PWA over reviving these projects.
