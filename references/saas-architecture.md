# SaaS Architecture & System Design

## 1. Architectural Philosophy: The Modular Monolith

For 99% of SaaS startups, a **Modular Monolith** is vastly superior to microservices. It delivers maximum developer velocity, zero distributed transaction overhead, straightforward debugging, and single-deployment simplicity.

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js / Node.js                    │
│                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐  │
│  │   Auth Module   │ │ Billing Module  │ │  Project  │  │
│  │ (Clerk / Auth)  │ │(Stripe Webhooks)│ │  Engine   │  │
│  └────────┬────────┘ └────────┬────────┘ └─────┬─────┘  │
│           │                   │                │        │
│  ┌────────┴───────────────────┴────────────────┴─────┐  │
│  │             Shared Domain Services                │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │         Data Access Layer (Prisma / Drizzle)       │  │
│  └────────────────────────┬──────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            ▼
               PostgreSQL / MongoDB Database
```

---

## 2. Next.js App Router & Server/Client Boundaries

In modern Next.js (App Router), maintain clear boundaries between Server Components, Server Actions, and Client Components.

### Boundary Rules
1. **Server Components by Default**:
   - Fetch data directly from databases or internal services.
   - Keep API keys, private tokens, and DB drivers on the server.
   - Zero JavaScript sent to the client bundle.
2. **Client Components (`'use client'`)**:
   - Keep them at the leaves of your component tree.
   - Use only for: interactivity (`onClick`, `onChange`), React state/hooks (`useState`, `useEffect`, `useTransition`), browser APIs (`localStorage`, geolocation), and third-party UI widgets.
3. **Data Mutations**:
   - Prefer **Server Actions** (`'use server'`) for form submissions and internal app mutations with `revalidatePath()` or `revalidateTag()`.
   - Use **Route Handlers** (`app/api/*/route.ts`) for external webhooks, public REST APIs, and file streams.

```tsx
// app/(dashboard)/projects/[id]/page.tsx (Server Component)
import { getProjectById } from "@/server/services/project-service";
import { ProjectEditForm } from "./project-edit-form"; // Client Component

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProjectById(params.id);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <ProjectEditForm initialData={project} />
    </div>
  );
}
```

---

## 3. Layered Backend Architecture

Separate concerns cleanly:
- **Routes / Actions Layer**: Input validation (Zod), authentication check, HTTP status codes.
- **Service / Domain Layer**: Business logic, transactional workflows, permissions, event emission.
- **Repository / DAL Layer**: Direct database queries, schema transformations.

```
API Route / Server Action
       │ (Zod parse, session check)
       ▼
Domain Service
       │ (Business rules, billing limit check)
       ▼
Data Access Layer (Prisma / Drizzle / Mongoose)
       │
       ▼
Database (PostgreSQL / MongoDB)
```

---

## 4. Database Selection & Schema Design

### PostgreSQL (Default for Relational & Financial SaaS)
- **When to Use**: Relational data, billing records, user permissions, transactions, strict data integrity.
- **ORM**: Prisma for rapid type-safety, Drizzle for lightweight zero-overhead SQL querying.
- **Indexes**: Add composite indexes on `[tenantId, createdAt]` and `[userId, status]`. Always index foreign keys.

```prisma
// Example Schema with Multi-Tenancy & Indexes
model Organization {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  plan      String    @default("free")
  createdAt DateTime  @default(now())
  users     OrgUser[]
  projects  Project[]
}

model Project {
  id             String       @id @default(cuid())
  orgId          String
  name           String
  status         String       @default("active")
  metadata       Json?        // Use JSONB for unstructured extensible attributes
  createdAt      DateTime     @default(now())
  organization   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
  @@index([orgId, createdAt(sort: Desc)])
}
```

### MongoDB (Default for High-Volume Document Stores / Event Streams)
- **When to Use**: Unstructured logs, dynamic CMS structures, nested polymorphic documents.
- **Rules**: Avoid deep relational joins across collections; embed related data when queried together; use compound indexes on query fields.

---

## 5. Background Jobs & Asynchronous Queues

Never execute long-running operations (>500ms) inside synchronous API requests.

### Operations That MUST Be Queued:
- Sending transactional emails or Telegram broadcasts.
- AI LLM batch generation or embeddings generation.
- Generating large PDF exports or media transcoding.
- Syncing data with third-party APIs (Stripe, GitHub, Shopify).

### Recommended Queue Solutions
1. **Inngest**: Serverless-native, step-based workflows, automatic retries with zero infrastructure setup.
2. **Upstash QStash**: Serverless HTTP-based queue with cron triggers.
3. **BullMQ + Redis**: High-throughput self-hosted background worker processing.

---

## 6. Webhook Management & Idempotency

Webhooks from Stripe, GitHub, or Telegram will be retried and delivered out-of-order.

### Webhook Handling Best Practices
1. **Always Verify HMAC Signatures**: Use `crypto.timingSafeEqual` or the vendor SDK before processing payloads.
2. **Enforce Idempotency**:
   - Store processed webhook IDs in a `WebhookEvent` table.
   - If the ID already exists with status `completed`, return HTTP 200 immediately.
3. **Acknowledge Fast**: Validate payload, store event in DB/Queue, return `HTTP 200 OK` within 2 seconds, then process asynchronously.

---

## 7. Multi-Tenancy Isolation

Prevent **IDOR** (Insecure Direct Object Reference) by enforcing tenant boundaries on every single database query.

```typescript
// SECURE PATTERN: Always scope by authenticated tenant/org
export async function getProject(orgId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      orgId: orgId, // CRITICAL: Guarantees user cannot access another tenant's project
    },
  });
  if (!project) throw new Error("Project not found");
  return project;
}
```

---

## 8. Type-Safe Environment Variables

Validate all environment variables at startup using Zod to prevent runtime crashes in production:

```typescript
// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);
```
