# Contributing to Modern SaaS Builder

Thank you for your interest in improving **Modern SaaS Builder**! This project is an open-source skill, architecture catalog, and CLI designed to empower AI agents and developers to build robust, secure, and profitable SaaS products.

---

## How You Can Contribute

1. **New Reference Playbooks (`references/`)**:
   - Add deep-dive guides for emerging architectural, infrastructure, billing, or AI patterns.
   - Every reference should be practical, concise, and focused on production outcomes rather than generic theory.
2. **Starter Templates (`templates/`)**:
   - Add battle-tested, modular boilerplates (Docker configurations, ORM/RLS migrations, webhook handlers, SDK wrappers).
3. **Verification & Audit Scripts (`scripts/`)**:
   - Improve health check, security, and verification bash scripts.
4. **CLI Features (`bin/cli.js`)**:
   - Enhance the zero-dependency CLI installer, exporter, or scaffolding capabilities.

---

## Development & Verification Workflow

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lijnati/modern-saas-builder-skills.git
   cd modern-saas-builder-skills
   ```

2. **Verify local integrity:**
   ```bash
   # Run health and integrity checks
   npm run doctor

   # Run verification scripts
   bash scripts/verify.sh
   bash scripts/project-health.sh
   bash scripts/security-check.sh
   ```

3. **Test CLI execution:**
   ```bash
   node bin/cli.js --help
   node bin/cli.js export --format agents-md --output ./scratch/AGENTS.md
   ```

---

## Standards for Reference Guides

When adding a new file under `references/`:
* Include an overview, core principles, concrete code examples/configurations, and common anti-patterns to avoid.
* Register the new reference in `SKILL.md` under the appropriate operating mode or index.
* Ensure all links use relative paths (e.g. `references/your-guide.md`).

---

## Pull Request Guidelines

1. Create a branch (`feature/my-new-guide` or `fix/cli-export`).
2. Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.
3. Ensure all tests and verification scripts pass.
4. Submit a Pull Request targeting the `main` branch.
