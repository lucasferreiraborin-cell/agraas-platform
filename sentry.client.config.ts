import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Percentage of transactions sent to Sentry for performance monitoring
  tracesSampleRate: 0.1,

  // Only enable Sentry in production and staging environments
  enabled: process.env.NODE_ENV === "production",

  // P1.2 pentest fix — do NOT set `release` here on the client config.
  // When `release` is defined in the browser bundle, @sentry/nextjs injects it
  // into the <meta name="baggage"> tag on every HTML response, exposing the
  // full 40-char Git commit SHA to unauthenticated visitors (CVSS 5.3 info leak).
  //
  // Release is still set server-side (sentry.server.config.ts) via
  // SENTRY_RELEASE env var so error grouping in the Sentry dashboard works.
  // Client-side errors are grouped by DSN + environment, which is sufficient.
  //
  // sentry-trace propagation headers continue to work — they don't depend on release.

  // Suppress noise from common browser extensions
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error exception captured",
  ],
});
