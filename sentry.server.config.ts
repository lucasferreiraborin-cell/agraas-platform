import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Lower sample rate for server — most errors are captured explicitly
  tracesSampleRate: 0.05,

  enabled: process.env.NODE_ENV === "production",

});
