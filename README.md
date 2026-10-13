# Modern SaaS Builder 🚀

[![npm version](https://img.shields.io/npm/v/modern-saas-builder.svg?color=cb3837)](https://www.npmjs.com/package/modern-saas-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI Status](https://img.shields.io/badge/CI-passing-brightgreen.svg)](.github/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Founder-minded senior product engineer and SaaS architect skill, playbooks, and CLI for AI agents.**

Works with **Antigravity**, **Cursor**, **Claude Code**, **Windsurf**, and any system supporting `AGENTS.md` / markdown agent skills.

---

## ⚡ Quick Start

### 1. Install via `npx` into your Workspace

Run the zero-dependency CLI installer to configure your agent workspace:

```bash
# Interactive / auto-detect install into your project
npx modern-saas init

# Target a specific AI coding tool:
npx modern-saas init cursor       # Configures .cursor/rules/modern-saas-builder.mdc
npx modern-saas init claude       # Installs to .claude/skills/modern-saas-builder
npx modern-saas init antigravity  # Installs to .agents/skills/modern-saas-builder
npx modern-saas init agents       # Creates unified AGENTS.md in workspace
```

**Claude Code plugin:** install it from the `lijnati-skills` marketplace instead, so it updates with `/plugin marketplace update`:

```
/plugin marketplace add lijnati/saas-brand-namer
/plugin install modern-saas-builder@lijnati-skills
```

### 2. Export / Compile into Single Rule Files

Compile the skill along with all 16+ architectural reference playbooks into a standalone file:

```bash
npx modern-saas export --format agents-md --output ./AGENTS.md
```

### 3. Scaffold Production Starter Templates

```bash
# List available starter templates
npx modern-saas templates

# Scaffold Docker, Multi-tenant RLS, Stripe Webhook, or Analytics
npx modern-saas scaffold docker ./deploy
npx modern-saas scaffold db ./prisma
npx modern-saas scaffold billing ./src/app/api/webhooks
```

---

## 📦 What's Included

### 📚 Specialized Architecture Playbooks (`references/`)

| Playbook | Domain / Description |
|---|---|
| [`product-discovery.md`](references/product-discovery.md) | Idea validation, JTBD, MVP boundary scoping, pricing signals |
| [`saas-architecture.md`](references/saas-architecture.md) | Modular monoliths, DB schemas, server boundaries, queues |
| [`multi-tenancy-rls.md`](references/multi-tenancy-rls.md) | Multi-tenancy models, Postgres RLS, tenant isolation & ORM middleware |
| [`ui-ux.md`](references/ui-ux.md) | High-converting SaaS design, dashboard layouts, forms, mobile UX |
| [`security.md`](references/security.md) | Auth, RBAC, IDOR prevention, CSRF/XSS, security audits |
| [`testing.md`](references/testing.md) | Unit, integration & E2E testing strategies, Definition of Done |
| [`production.md`](references/production.md) | Docker, Vercel, CI/CD, logging, zero-downtime database migrations |
| [`monetization.md`](references/monetization.md) | Subscriptions, Stripe webhooks, metered billing, churn prevention |
| [`compliance-launch-readiness.md`](references/compliance-launch-readiness.md) | GDPR/CCPA data rights, legal checklists, launch gates |
| [`growth.md`](references/growth.md) | Getting first 100 users, PLG, SEO strategies, referral loops |
| [`ai-agents.md`](references/ai-agents.md) | AI agent architecture, tool calling, context & prompt eval loops |
| [`ai-observability-evals.md`](references/ai-observability-evals.md) | Langfuse/Helicone tracing, token cost control, automated prompt evals |
| [`web3.md`](references/web3.md) | Smart contracts, Foundry, Base (L2), ERC-20/USDC standards |
| [`agent-commerce.md`](references/agent-commerce.md) | Autonomous agent wallets, spending limits, x402 settlement |
| [`telegram-products.md`](references/telegram-products.md) | Telegram Bot API, grammY, Telegram Mini Apps (TMA) |
| [`developer-experience.md`](references/developer-experience.md) | TypeScript standards, repository hygiene, refactoring playbooks |

---

### 🛠️ Production Starter Templates (`templates/`)

* **`templates/docker/`**: Production multi-stage Next.js `Dockerfile` and hardened `docker-compose.prod.yml` with Postgres, Redis, and Caddy SSL.
* **`templates/db/`**: Complete PostgreSQL Multi-tenant Row-Level Security (RLS) SQL schema with helper functions.
* **`templates/billing/`**: Idempotent Stripe Webhook handler for Next.js App Router.
* **`templates/analytics/`**: Type-safe PostHog / Mixpanel event taxonomy.

---

### 🛡️ Audit & Verification Scripts (`scripts/`)

Run audits directly from your terminal:

```bash
bash scripts/project-health.sh  # Evaluates setup, package manager, and readiness
bash scripts/verify.sh          # Runs typechecking, linting, tests, and build checks
bash scripts/security-check.sh  # Scans for exposed secrets, .env leaks, and insecure code
```

---

## 🛠️ CLI Commands & Options

```
Usage: npx modern-saas <command> [options]

Commands:
  init [target]       Install skill into your agent workspace (antigravity, claude, cursor, windsurf, agents, all)
  doctor              Run repository & skill integrity health checks
  export              Compile multi-file skill into single-file agent rules (--format, --output)
  templates           List available SaaS starter templates
  scaffold <name>     Copy a starter template into your project
  version, -v         Display CLI version
  help, -h            Show help screen
```

---

## 🤝 Contributing

Contributions from founders, engineers, and agent architects are welcome!
Please check out [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 📄 License

[MIT](LICENSE) © 2026 Lijnati and Contributors.