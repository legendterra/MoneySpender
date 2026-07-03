import * as Sentry from "@sentry/nextjs";

// No-op when NEXT_PUBLIC_SENTRY_DSN is empty.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
