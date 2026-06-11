import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable SWC minification for faster builds and smaller bundles
  swcMinify: true,

  // Compress responses
  compress: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

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

  // Headers for caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;