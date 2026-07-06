import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Lower sample rate for server — most errors are captured explicitly
  tracesSampleRate: 0.05,

  enabled: process.env.NODE_ENV === "production",

  // Server-side release for error grouping in the Sentry dashboard.
  // Set SENTRY_RELEASE=<short-sha> in Vercel env vars (7 chars, e.g. via
  // `git rev-parse --short HEAD`). This is never emitted to the browser DOM.
  release: process.env.SENTRY_RELEASE,
});
