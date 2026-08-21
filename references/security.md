# SaaS & Web3 Security Playbook

## 1. Authentication & Session Security

Secure user sessions from day one using industry standards:
- **Cookies**: Store session tokens exclusively in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Never store sensitive tokens in `localStorage` (vulnerable to XSS).
- **Session Lifespans**:
  - Regular Session: 7 to 30 days with rolling renewal.
  - Sensitive Operations (billing, API key management, team deletion): Require password re-entry or 2FA step-up.
- **Provider Choice**:
  - Managed B2B: Clerk, WorkOS (SAML/SSO).
  - Open Source: Auth.js / NextAuth, Lucia, Supabase Auth.

---

## 2. Authorization & IDOR (Insecure Direct Object Reference) Prevention

The most common critical vulnerability in SaaS is failing to verify organization/tenant ownership on object mutations.

### The IDOR Vulnerability Pattern (VULNERABLE)
```typescript
// ❌ CRITICAL BUG: Any user can delete any project if they know the UUID
export async function deleteProject(projectId: string) {
  await db.project.delete({ where: { id: projectId } });
}
```

### Secure Multi-Tenant Pattern (SECURE)
```typescript
// ✅ SECURE: Query scoped strictly to the authenticated user's organization
export async function deleteProject(orgId: string, projectId: string, userRole: string) {
  if (userRole !== "admin" && userRole !== "owner") {
    throw new ForbiddenError("Insufficient permissions");
  }

  const result = await db.project.deleteMany({
    where: {
      id: projectId,
      orgId: orgId, // Mandatory tenant constraint
    },
  });

  if (result.count === 0) {
    throw new NotFoundError("Project not found or unauthorized");
  }
}
```

---

## 3. Input Validation & Injection Defense

### Strict Boundary Parsing with Zod
Never trust client inputs. Validate every HTTP body, query param, and webhook:

```typescript
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  name: z.string().min(2).max(100).trim(),
  role: z.enum(["member", "admin"]).default("member"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

### SQL & NoSQL Injection Protection
- **SQL (Postgres)**: Always use parameterized queries via ORMs (Prisma, Drizzle) or template literals (`sql\`SELECT * FROM users WHERE id = ${id}\``).
- **NoSQL (MongoDB)**: Sanitize object keys (`$where`, `$gt`) to prevent NoSQL query operator injection.

---

## 4. SSRF (Server-Side Request Forgery) Defense

When allowing users to input URLs for webhooks, scraping, or metadata fetching:
1. Parse the URL and validate protocol is strictly `http:` or `https:`.
2. Resolve DNS and block private IP ranges (RFC 1918):
   - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16` (Cloud Metadata AWS/GCP).
3. Set tight timeouts (max 3-5 seconds) and disable redirect following across internal domains.

---

## 5. Rate Limiting & Abuse Prevention

Protect authentication endpoints, AI generation routes, and public APIs:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
  if (!success) {
    throw new TooManyRequestsError("Rate limit exceeded. Try again in 60s.");
  }
}
```

---

## 6. Secure File Upload Architecture

Never accept raw files directly through server application memory.

```
Client App
   ↓ 1. Requests upload URL with file metadata (size, content-type)
API Server (Validates auth, tenant limits, restricts MIME types)
   ↓ 2. Generates pre-signed S3 / Cloudflare R2 upload URL
Client App
   ↓ 3. Directly PUTs binary file to S3 / Cloudflare R2
S3 / R2 Bucket (Encrypted, public read disabled, served via CDN)
```

---

## 7. Web3 & Smart Contract Security

When dealing with EVM, Base, Solidity, or Agent Wallets:

### Smart Contract Protections
- **Reentrancy**: Use OpenZeppelin's `ReentrancyGuard` or Checks-Effects-Interactions pattern.
- **Access Control**: Use `Ownable2Step` (two-step ownership transfer) or `AccessControl` roles.
- **Integer Arithmetic**: Solidity 0.8+ has built-in overflow/underflow checks.
- **Safe Token Transfers**: Always use `SafeERC20` when interacting with arbitrary ERC-20 tokens.

### Key Management & Agent Spending Bounds
- **Never hardcode private keys** in source code, Dockerfiles, or git repositories.
- **Session Keys & Daily Spending Limits**: Autonomous agents must operate under strict smart-contract or custodial spending caps (e.g. max $100/day USDC).
- **Transaction Simulation**: Always simulate transactions via RPC (`eth_call` or Tenderly) before signing and broadcasting.
