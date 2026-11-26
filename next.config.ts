import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// 'unsafe-eval' is required by React Fast Refresh in dev only.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "https://va.vercel-scripts.com",
  process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Compress responses
  compress: true,

  // Image optimization
  images: {
    remotePatterns: [],
    // Optimize images served
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: ["lucide-react", "date-fns", "@supabase/supabase-js"],
  },

  // v2: no marketing landing and no paywall (docs/redesign/PLAN.md section 4).
  // Unauthenticated visitors of /dashboard end on /auth. Old v1 screens moved.
  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
      { source: "/pricing", destination: "/dashboard", permanent: true },
      { source: "/expenses", destination: "/history?type=expense", permanent: true },
      { source: "/income", destination: "/history?type=income", permanent: true },
      { source: "/all-transactions", destination: "/history", permanent: true },
      { source: "/net-worth", destination: "/wallets", permanent: true },
      { source: "/goals", destination: "/settings", permanent: true },
    ];
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Org/project/token hanya dibutuhkan untuk upload source map saat build
  // (isi di env Vercel). Tanpa itu, build tetap jalan normal.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Kirim event lewat /monitoring agar tidak diblokir ad-blocker.
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});