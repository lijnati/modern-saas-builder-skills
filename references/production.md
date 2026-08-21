# Production Operations, Deployment & Observability

## 1. Hosting Architecture & Platform Selection

Match infrastructure to your application's operational profile:

| Workload Type | Recommended Platform | Why |
|---|---|---|
| **Next.js / Frontend App** | **Vercel** / **Cloudflare Pages** | Instant global edge CDN, automatic preview branches, zero-config SSR. |
| **Long-Running Workers / Cron / Bots** | **Railway** / **Fly.io** / **Render** | Persistent Node.js/Python processes, Telegram bot polling, WebSocket servers. |
| **PostgreSQL Database** | **Neon** / **Supabase** / **AWS RDS** | Automated backups, point-in-time recovery, connection pooling (pgBouncer). |
| **Redis / Cache / Queues** | **Upstash** (Serverless) / **Dragonfly** | Low-latency key-value storage, rate limiting, QStash queue integration. |

---

## 2. Zero-Downtime Database Migrations (Expand-and-Contract)

Never perform breaking schema changes (e.g. renaming columns or dropping active tables) in a single deployment.

### The 3-Step Expand-and-Contract Pattern

```
Phase 1: EXPAND
- Add new column `fullName` nullable in DB migration.
- Deploy code that writes to BOTH `name` (old) and `fullName` (new), but reads from `name`.

Phase 2: BACKFILL
- Run background script: `UPDATE users SET "fullName" = "name" WHERE "fullName" IS NULL;`

Phase 3: CONTRACT
- Deploy code that reads and writes exclusively to `fullName`.
- Deploy final migration: Drop old `name` column and set `fullName` NOT NULL.
```

---

## 3. Observability, Logging & Error Monitoring

### 1. Error Tracking (Sentry / Highlight)
Catch uncaught client-side and server-side exceptions immediately:

```typescript
// app/error.tsx (Next.js Global Error Boundary)
'use client';
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
      <button onClick={() => reset()} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white">
        Try again
      </button>
    </div>
  );
}
```

### 2. Structured Logging
Never use raw `console.log("here")` in production. Use structured JSON logs with correlation IDs:

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["password", "token", "apiKey", "creditCard"],
});

// Usage
logger.info({ userId: user.id, orgId: user.orgId, action: "project_created" }, "Project created successfully");
```

---

## 4. Health Check Endpoint

Implement a resilient `/api/health` route that verifies connectivity across all critical dependencies:

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, string> = {};

  try {
    // Check Database Connectivity
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (err) {
    checks.database = "down";
  }

  const isHealthy = Object.values(checks).every((status) => status === "ok");
  const latency = Date.now() - startTime;

  return NextResponse.json(
    { status: isHealthy ? "healthy" : "degraded", checks, latencyMs: latency },
    { status: isHealthy ? 200 : 503 }
  );
}
```

---

## 5. Production Readiness Checklist

Verify all items before opening your SaaS to public traffic:

### Security & Privacy
- [ ] HTTPS enforced across all domains with automatic SSL certificate renewal.
- [ ] Security headers active (HSTS, Content-Security-Policy, X-Frame-Options: DENY).
- [ ] Database connection string uses SSL (`?sslmode=require`).
- [ ] All `.env` files added to `.gitignore`. Secrets managed in Vercel / Railway dashboard.

### Operational Resilience
- [ ] Automated database daily snapshots enabled with 30-day retention.
- [ ] Sentry error alerts configured to send alerts to Slack or Telegram.
- [ ] Rate limits active on `/api/auth/*` and AI generation endpoints.
- [ ] Stripe Webhook endpoint registered and tested with live secret key.
- [ ] Custom domain DNS configured with low TTL during launch for fast rollback capability.
