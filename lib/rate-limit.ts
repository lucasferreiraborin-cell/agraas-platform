type Entry = { count: number; resetAt: number };

const _store = new Map<string, Entry>();

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function checkRateLimit(
  req: Request,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const ip = getIp(req);
  const pathname = new URL(req.url).pathname;
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = _store.get(key);

  if (!entry || now > entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function tooManyRequests(retryAfter: number): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: { "Retry-After": String(retryAfter), "Content-Type": "text/plain" },
  });
}
