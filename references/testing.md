# Comprehensive SaaS Testing & Quality Engineering

## 1. The SaaS Testing Pyramid

High-performing product teams avoid slow, brittle test suites by balancing their testing pyramid:

```
          ▲
         / \       E2E Tests (Playwright / Cypress)
        /   \      - Top 5 critical user flows (Sign up, Checkout, Core loop)
       /─────\
      /       \    Integration & API Tests (Vitest + Supertest / Next.js Test)
     /         \   - Route handlers, database queries, webhook processing, auth
    /───────────\
   /             \ Unit Tests (Vitest / Jest)
  /               \ - Pure domain logic, pricing calculations, date math, Zod schemas
 └─────────────────┘
```

---

## 2. Test Outcomes & Contracts, Not Implementation Details

### Bad Test (Brittle & Tied to Implementation)
```typescript
// ❌ Testing internal state or private functions
it("updates internal counter state to 1", () => {
  const service = new ProjectService();
  service._internalCounter = 0;
  service._increment();
  expect(service._internalCounter).toBe(1);
});
```

### Good Test (Behavior & Value Contract)
```typescript
// ✅ Testing observable user outcome and database state
it("creates project within tenant boundary and increments active project count", async () => {
  const org = await createTestOrg();
  const res = await createProject(org.id, { name: "Analytics Dashboard" });

  expect(res.id).toBeDefined();
  expect(res.name).toBe("Analytics Dashboard");

  const projectInDb = await db.project.findFirst({ where: { id: res.id, orgId: org.id } });
  expect(projectInDb).not.toBeNull();
});
```

---

## 3. Database & Integration Testing Strategies

1. **Transactional Rollbacks**: Run each integration test inside a database transaction and rollback upon completion for instant test isolation.
2. **Ephemeral Containers**: Use Docker Compose or `@testcontainers/postgresql` in CI for zero-flakiness Postgres/Mongo testing.
3. **Database Seed Fixtures**: Create reusable helper factories:
   ```typescript
   export async function createTestUser(overrides = {}) {
     return db.user.create({
       data: {
         email: `test-${Date.now()}@example.com`,
         name: "Test User",
         role: "admin",
         ...overrides,
       },
     });
   }
   ```

---

## 4. Third-Party Mocking Strategy (MSW)

Never hit live external third-party APIs (Stripe, OpenAI, Telegram, Resend) during automated test suites. Use **Mock Service Worker (MSW)** or dependency injection:

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const handlers = [
  // Mock Stripe Customer Creation
  http.post("https://api.stripe.com/v1/customers", () => {
    return HttpResponse.json({
      id: "cus_test_12345",
      object: "customer",
      email: "test@example.com",
    });
  }),
  // Mock AI Completion API
  http.post("https://api.openai.com/v1/chat/completions", () => {
    return HttpResponse.json({
      choices: [{ message: { content: '{"summary":"AI generated summary"}' } }],
    });
  }),
];

export const server = setupServer(...handlers);
```

---

## 5. End-to-End (E2E) Browser Testing with Playwright

Automate the 3 critical money-making flows in your application:

```typescript
// tests/e2e/auth-and-checkout.spec.ts
import { test, expect } from "@playwright/test";

test("user can sign up, access onboarding, and initiate checkout", async ({ page }) => {
  await page.goto("/signup");

  // Fill credentials
  await page.fill('input[name="email"]', `user-${Date.now()}@example.com`);
  await page.fill('input[name="password"]', "SecureP@ssw0rd123!");
  await page.click('button[type="submit"]');

  // Verify dashboard redirect
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("h1")).toContainText("Welcome");

  // Upgrade Plan
  await page.click('text="Upgrade to Pro"');
  await expect(page.locator("text=Checkout")).toBeVisible();
});
```

---

## 6. Definition of Done (DoD) Checklist

A feature is strictly NOT complete until all items pass:

- [ ] **TypeScript**: `tsc --noEmit` runs with 0 errors.
- [ ] **Linter**: `npm run lint` passes with 0 warnings/errors.
- [ ] **Automated Tests**: Unit and integration tests pass for happy path AND edge cases (unauthorized, invalid input, duplicate slug).
- [ ] **Mobile & Responsive**: Viewport tested at 375px and 1280px without layout breakage.
- [ ] **Error States**: Verified behavior when network fails or API returns 500.
- [ ] **Security**: Verified tenant scoping on all database queries (IDOR protection).
- [ ] **Logging & Telemetry**: Added structured logging for critical business actions.
