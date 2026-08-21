# SaaS Monetization, Billing & Payment Architecture

## 1. Selecting the Right Pricing Model

Align your pricing metric directly with how your customer perceives value.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Flat Monthly Subscription ($29 / $79 / $199 /mo)         │
│    Best For: Micro-SaaS, B2B niche utilities, solo founders │
├─────────────────────────────────────────────────────────────┤
│ 2. Per-Seat / User Tier ($15 / seat / mo)                   │
│    Best For: Collaboration tools, CRM, project management   │
├─────────────────────────────────────────────────────────────┤
│ 3. Usage-Based / Metered ($0.05 / credit or API request)    │
│    Best For: AI generation, scraping, SMS/email APIs        │
├─────────────────────────────────────────────────────────────┤
│ 4. Hybrid (Base Platform Fee + Metered Usage Credits)       │
│    Best For: Modern AI SaaS & developer infrastructure      │
└─────────────────────────────────────────────────────────────┘
```

### The Value Metric Rule
Pick a single unit that grows as the customer succeeds (e.g. *Active Clients Managed*, *Invoices Processed*, *Transcripts Generated*). Avoid artificial restrictions on basic usability (like capping the number of projects at 3 on paid tiers).

---

## 2. Stripe Integration Architecture

Use **Stripe Checkout** for hosted payment collection and the **Stripe Customer Portal** for self-serve subscription management.

```
Client App (Click "Upgrade to Pro")
   ↓
API Route (`/api/billing/checkout`)
   ↓ Creates Stripe Checkout Session with `metadata: { orgId }`
Stripe Hosted Checkout Page (Credit Card / Apple Pay)
   ↓ Customer completes payment
Stripe Webhook (`checkout.session.completed`, `invoice.payment_succeeded`)
   ↓ API Route (`/api/webhooks/stripe`)
Database: Updates Organization tier to `pro` and sets `subscriptionStatus = "active"`
```

### Critical Webhook Handlers
Handle these 4 events to maintain 100% accurate billing state:

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from "@/server/stripe";
import { db } from "@/server/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.metadata?.orgId;
      if (orgId) {
        await db.organization.update({
          where: { id: orgId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            plan: "pro",
            subscriptionStatus: "active",
          },
        });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      // Renew credits or active period
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      // Mark past_due, send email notification, trigger grace period
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.organization.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: "free", subscriptionStatus: "canceled" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
```

---

## 3. Entitlements & Feature Gating

Enforce feature access and usage limits at the **Service Layer**, not just in UI view components.

```typescript
// server/services/entitlement-service.ts
export const PLAN_LIMITS = {
  free: { maxProjects: 2, canExportPdf: false, aiCreditsPerMonth: 100 },
  pro: { maxProjects: 50, canExportPdf: true, aiCreditsPerMonth: 5000 },
  enterprise: { maxProjects: 1000, canExportPdf: true, aiCreditsPerMonth: 100000 },
};

export async function verifyFeatureAccess(orgId: string, feature: "canExportPdf" | "maxProjects") {
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

  if (feature === "canExportPdf" && !limits.canExportPdf) {
    throw new ForbiddenError("PDF Export is available on the Pro plan. Please upgrade.");
  }

  if (feature === "maxProjects") {
    const projectCount = await db.project.count({ where: { orgId } });
    if (projectCount >= limits.maxProjects) {
      throw new ForbiddenError(`Project limit of ${limits.maxProjects} reached for current plan.`);
    }
  }
}
```

---

## 4. Key SaaS Financial Metrics & Formulas

Monitor these core health metrics:

- **MRR (Monthly Recurring Revenue)**: $\text{Active Subscriptions} \times \text{Average Price}$
- **ARPU (Average Revenue Per User)**: $\frac{\text{Total MRR}}{\text{Total Active Paying Customers}}$
- **User Churn Rate**: $\frac{\text{Customers Lost in Period}}{\text{Total Customers at Start of Period}} \times 100$ (Target < 3-5%/month)
- **LTV (Customer Lifetime Value)**: $\frac{\text{ARPU}}{\text{User Churn Rate}}$
- **CAC (Customer Acquisition Cost)**: $\frac{\text{Total Sales \& Marketing Spend}}{\text{New Customers Acquired}}$
- **LTV : CAC Ratio**: Target $\ge 3:1$ for sustainable profitability.
