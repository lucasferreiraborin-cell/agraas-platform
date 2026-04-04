import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

const cspHeader = [
  "default-src 'self'",
  // Scripts: self + Sentry CDN
  "script-src 'self' 'unsafe-inline' https://browser.sentry-cdn.com",
  // Styles: self + inline (Next.js injects critical CSS)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + Supabase storage + Leaflet/OpenStreetMap tiles
  `img-src 'self' data: https://${supabaseHost} https://*.tile.openstreetmap.org`,
  // Fonts: self
  "font-src 'self'",
  // API connections: self + Supabase + Sentry + OpenStreetMap (Leaflet tile attribution)
  `connect-src 'self' https://${supabaseHost} https://o*.ingest.sentry.io https://*.tile.openstreetmap.org`,
  // Frames: none
  "frame-src 'none'",
  // Objects: none
  "object-src 'none'",
  // Base URI: self only
  "base-uri 'self'",
  // Form action: self only
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress the Sentry CLI output during builds
  silent: true,
  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
  // Upload source maps only in CI/production
  widenClientFileUpload: true,
});
