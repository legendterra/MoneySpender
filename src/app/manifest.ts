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
      background_color: "#f7fbff",
      theme_color: "#3f7cff",
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
          name: "Dashboard",
          short_name: "Dashboard",
          description: "Lihat ringkasan uang hari ini.",
          url: "/dashboard",
          icons: [{ src: "/icon-192.png", sizes: "192x192" }],
        },
        {
          name: "Tambah Pengeluaran",
          short_name: "Pengeluaran",
          description: "Catat uang keluar dengan cepat.",
          url: "/expenses#form",
          icons: [{ src: "/icon-192.png", sizes: "192x192" }],
        },
        {
          name: "Tambah Pemasukan",
          short_name: "Pemasukan",
          description: "Catat uang masuk dengan cepat.",
          url: "/income#form",
          icons: [{ src: "/icon-192.png", sizes: "192x192" }],
        },
      ],
    };
  }
