import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Suppress the Sentry CLI output during builds
  silent: true,
  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
  // Upload source maps only in CI/production
  widenClientFileUpload: true,
});
