import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Percentage of transactions sent to Sentry for performance monitoring
  tracesSampleRate: 0.1,

  // Only enable Sentry in production and staging environments
  enabled: process.env.NODE_ENV === "production",

  // Suppress noise from common browser extensions
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error exception captured",
  ],
});
