import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    prefer_related_applications: false,
    background_color: "#0e1012",
    theme_color: "#0e1012",
    lang: "id-ID",
    orientation: "portrait",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Catat pengeluaran",
        short_name: "Catat",
        description: "Catat uang keluar dengan cepat.",
        url: "/dashboard?catat=expense",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Catat pemasukan",
        short_name: "Pemasukan",
        description: "Catat uang masuk dengan cepat.",
        url: "/dashboard?catat=income",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Riwayat",
        short_name: "Riwayat",
        description: "Lihat semua catatan per hari.",
        url: "/history",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
