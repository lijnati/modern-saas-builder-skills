# SaaS Compliance, Legal & Launch Readiness Playbook

Checklist and architectural patterns for legal compliance, data privacy, and production launch gates.

---

## 1. Data Privacy & Compliance (GDPR & CCPA)

### Mandatory Customer Rights Workflows

1. **Right to Access / Data Export (`GET /api/user/export`)**:
   - Provide a background job that bundles all user profile data, logs, and uploaded files into a password-protected zip file.
2. **Right to be Forgotten / Deletion (`DELETE /api/user/account`)**:
   - Hard-delete or securely anonymize personal identifiable information (PII).
   - Cancel active Stripe subscriptions immediately.
   - Clean up files from S3/R2 storage buckets.
3. **Cookie Consent & Tracking**:
   - Do not fire non-essential tracking pixels (Meta Pixel, Google Ads, TikTok Pixel) before explicit opt-in for EU/UK visitors.
   - PostHog / Mixpanel: enable cookieless tracking or configure consent banners.

---

## 2. Legal Essentials Checklist

Before accepting live payments from users:
- [ ] **Terms of Service**: Clearly state billing recurrence, refund policy, SLA limits, and dispute resolution.
- [ ] **Privacy Policy**: Explicitly list all sub-processors (e.g. AWS, Stripe, PostHog, OpenAI, Resend).
- [ ] **Data Processing Agreement (DPA)**: Required for B2B European customers.
- [ ] **Imprint / Contact Info**: Company registered name, address, and support email easily accessible in footer.

---

## 3. Production Launch Gate Checklist

Run this 48 hours before public launch:

### Security & Infrastructure
- [ ] Automated daily database backups configured with point-in-time recovery (PITR).
- [ ] SSL / TLS 1.3 enforced with HTTP Strict Transport Security (HSTS) headers.
- [ ] Secrets removed from Git history; production secrets managed via Doppler / Infisical / Vercel Environment Variables.
- [ ] Rate-limiting enabled on authentication routes (`/api/auth/*`) and AI endpoints.

### Monitoring & Operations
- [ ] Error tracking active (Sentry / GlitchTip) with source maps uploaded.
- [ ] Uptime monitoring configured (BetterStack / Checkly / Uptime Kuma) with SMS/Discord/Slack webhook alerts.
- [ ] Transactional email DNS records verified (SPF, DKIM, DMARC on Resend / Postmark / SendGrid).

### Billing & Monetization
- [ ] Stripe Webhook tested in live mode with test credit cards and real micro-charges.
- [ ] Customer portal enabled (`Stripe Customer Portal`) for self-service billing management and cancellations.
