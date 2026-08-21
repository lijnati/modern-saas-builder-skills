# Developer Experience, TypeScript Standards & Codebase Hygiene

## 1. Clean Repository Structure

Organize files by feature domain or layered responsibility:

```
my-saas/
├── .github/workflows/          # CI/CD test and deploy pipelines
├── app/                        # Next.js App Router (pages, layouts, route handlers)
│   ├── (auth)/                 # Route group: login, signup, forgot-password
│   ├── (dashboard)/            # Route group: authenticated SaaS dashboard
│   ├── (marketing)/            # Route group: landing page, pricing, blog
│   └── api/                    # Public APIs & Webhooks (Stripe, Telegram)
├── components/                 # Reusable UI components (buttons, modals, tables)
│   └── ui/                     # Primitives (Radix / Tailwind primitives)
├── server/                     # Server-side business logic (Zero client leakage)
│   ├── db/                     # Prisma / Drizzle client instance & schema
│   ├── services/               # Core business domain logic
│   └── auth/                   # Authentication & session helpers
├── lib/                        # Shared utility functions (formatters, dates)
├── types/                      # Global TypeScript definitions
├── tests/                      # Unit, integration, and E2E tests
├── public/                     # Static assets (images, favicon)
├── package.json
└── tsconfig.json
```

---

## 2. Strict TypeScript Standards

Eliminate runtime bugs by enabling strict compiler flags:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### TypeScript Best Practices
1. **Zero `any` Policy**: Use `unknown` with Zod parsing or type guards instead of `any`.
2. **Schema-Driven Types**: Derive types directly from Zod schemas rather than maintaining duplicate interfaces:
   ```typescript
   export const ProjectSchema = z.object({ id: z.string(), name: z.string() });
   export type Project = z.infer<typeof ProjectSchema>;
   ```
3. **Explicit Function Return Types**: Always specify return types on public service methods to prevent unintended interface drift.

---

## 3. Git Hygiene & Conventional Commits

Keep history clean and self-documenting:

### Conventional Commit Format
```
<type>(<scope>): <short imperative description>

[optional body explaining motivation and trade-offs]
```

### Allowed Types:
- `feat`: New feature for the user.
- `fix`: Bug fix in existing functionality.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing tests or correcting existing tests.
- `docs`: Documentation changes only.
- `chore`: Build process, dependencies, or tooling updates.

#### Examples:
- `feat(billing): add Stripe metered credit webhook handler`
- `fix(auth): enforce tenant orgId scoping on project deletion`
- `refactor(db): migrate project queries from raw SQL to Drizzle ORM`

---

## 4. Refactoring Playbook

When improving existing code:
1. **Never Break Working Tests**: Run `npm test` before touching any code.
2. **Make Small, Incremental Moves**: Refactor one function, file, or component at a time.
3. **Maintain Backwards Compatibility**: If modifying shared APIs, provide temporary deprecation shims before deleting old parameters.
4. **Verify Behavior**: Run full typecheck and test suite after each atomic step.
