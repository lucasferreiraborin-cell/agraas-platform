/**
 * withApiSentry — wraps Next.js App Router route handlers with Sentry error capture.
 *
 * Usage:
 *   export const GET = withApiSentry(async (req) => { ... });
 *   export const POST = withApiSentry(async (req) => { ... });
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

export function withApiSentry(handler: RouteHandler): RouteHandler {
  return async function sentryWrapped(req: NextRequest, ctx?: unknown): Promise<Response> {
    try {
      return await handler(req, ctx);
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          route: new URL(req.url).pathname,
          method: req.method,
        },
      });
      console.error("[API Error]", req.method, new URL(req.url).pathname, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
