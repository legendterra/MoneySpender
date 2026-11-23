import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://money.moneyspender.net";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${baseUrl}/auth`, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
