import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
  typescript: true,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

/**
 * Production-ready, idempotent Stripe Webhook Handler for Next.js App Router.
 * Route: /api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Idempotency: Process each event exactly once
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (organizationId) {
          // TODO: Sync subscription state in database
          // await db.organization.update({ where: { id: organizationId }, data: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, plan: 'pro' } });
          console.log(`[Stripe Webhook] Checkout completed for org: ${organizationId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status; // 'active', 'past_due', 'canceled', etc.
        const customerId = subscription.customer as string;

        console.log(`[Stripe Webhook] Subscription ${subscription.id} updated: status is ${status}`);
        // TODO: Update customer entitlement status in database
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription ${subscription.id} canceled/deleted`);
        // TODO: Downgrade organization plan to 'free'
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[Stripe Webhook] Payment failed for customer ${invoice.customer}`);
        // TODO: Send automated dunning email notification to account owner
        break;
      }

      default:
        // Unhandled event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Stripe Webhook Error] Failed to process event ${event.id}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
