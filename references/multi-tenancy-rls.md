# Multi-Tenancy & Row-Level Security (RLS) Architecture

Data isolation is the single most critical security requirement for B2B and SaaS applications.

---

## 1. Comparing Multi-Tenancy Models

| Strategy | Isolation Level | Operational Complexity | Cost Efficiency | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **Shared DB + Row-Level Security (RLS)** | High (Kernel/Engine enforced) | Low (Single migration runner) | Maximum | 95% of Modern B2B SaaS |
| **Schema-per-Tenant** | Medium-High | High (100s of schemas to migrate) | Medium | Regulated Mid-Market |
| **Database-per-Tenant** | Maximum | Extreme (Connection pools, costs) | Low | Enterprise / HIPAA / On-Prem |

> **Recommendation**: Default to **Shared Database + PostgreSQL RLS**. It provides enterprise-grade isolation without the operational burden of managing hundreds of individual database instances.

---

## 2. PostgreSQL RLS Implementation Pattern

### Step 1: Base Tables & Tenant Reference
Every tenant-scoped table MUST include an `organization_id` foreign key.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_org ON documents(organization_id);
```

### Step 2: Session Context Setter
Configure your backend middleware or database connection wrapper to set the current tenant context for every transaction:

```sql
SET LOCAL app.current_tenant_id = 'tenant-uuid-1234';
```

### Step 3: Enable RLS and Policies
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant_isolation ON documents
    FOR ALL
    USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID)
    WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
```

---

## 3. ORM Integration Patterns

### Drizzle ORM Multi-Tenant Middleware
```typescript
import { sql } from 'drizzle-orm';
import { db } from './db';

export async function withTenant<T>(tenantId: string, callback: (tx: typeof db) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
    return await callback(tx as any);
  });
}
```

### Prisma Client Extension
```typescript
export function getTenantClient(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}
```

---

## 4. Multi-Tenant Gotchas & Checklist

- [ ] **Bypass RLS in Migrations Only**: Only migration runners and internal system workers should use the `postgres` superuser or `BYPASSRLS` role.
- [ ] **Connection Pooling (PgBouncer/Supabase Pooler)**: Use `SET LOCAL` within transactions instead of `SET SESSION` to avoid tenant bleeding across connection pools.
- [ ] **Composite Indexes**: Include `(organization_id, id)` or `(organization_id, created_at)` on high-volume tables for index scans.
