import type { MetadataRoute } from "next";

import { appDescription, appName } from "@/features/ui/site-content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: "EU Heat Zones",
    description: appDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#e6edf5",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/euhz-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/euhz-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
