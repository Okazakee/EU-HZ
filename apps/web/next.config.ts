import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : null;
const connectSrc = [
  "'self'",
  ...(apiOrigin ? [apiOrigin] : []),
  "https://euhzbe.okazakee.dev",
  "https://basemaps.cartocdn.com",
  "https://tiles.basemaps.cartocdn.com",
  "https://tiles-a.basemaps.cartocdn.com",
  "https://tiles-b.basemaps.cartocdn.com",
  "https://tiles-c.basemaps.cartocdn.com",
  "https://tiles-d.basemaps.cartocdn.com",
].join(" ");

const csp = [
  "default-src 'self'",
  `connect-src ${connectSrc}`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://tiles-a.basemaps.cartocdn.com https://tiles-b.basemaps.cartocdn.com https://tiles-c.basemaps.cartocdn.com https://tiles-d.basemaps.cartocdn.com",
  "font-src 'self' https://tiles.basemaps.cartocdn.com https://tiles-a.basemaps.cartocdn.com https://tiles-b.basemaps.cartocdn.com https://tiles-c.basemaps.cartocdn.com https://tiles-d.basemaps.cartocdn.com",
  "worker-src 'self' blob:",
  "frame-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
