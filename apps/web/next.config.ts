import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "connect-src 'self' https://euhzbe.okazakee.dev https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com",
  "font-src 'self' https://tiles.basemaps.cartocdn.com",
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
