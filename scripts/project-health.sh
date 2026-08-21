#!/usr/bin/env bash
# project-health.sh - Non-destructive project health & environment auditor
set -e

echo "=========================================="
echo "      SAAS PROJECT HEALTH AUDIT"
echo "=========================================="
echo ""

# 1. Detect Package Manager
echo "[1/6] Detecting Package Manager & Runtime..."
PKG_MANAGER="none"
if [ -f "pnpm-lock.yaml" ]; then
    PKG_MANAGER="pnpm"
elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
    PKG_MANAGER="bun"
elif [ -f "yarn.lock" ]; then
    PKG_MANAGER="yarn"
elif [ -f "package-lock.json" ]; then
    PKG_MANAGER="npm"
elif [ -f "package.json" ]; then
    PKG_MANAGER="npm (default)"
fi
echo "  → Detected Package Manager: $PKG_MANAGER"

if command -v node >/dev/null 2>&1; then
    echo "  → Node.js Version: $(node -v)"
else
    echo "  → Node.js: Not found in PATH"
fi
echo ""

# 2. Inspect package.json & Framework
echo "[2/6] Inspecting Framework & Dependencies..."
if [ -f "package.json" ]; then
    if grep -q '"next"' package.json; then
        echo "  → Framework: Next.js"
    elif grep -q '"vite"' package.json; then
        echo "  → Framework: Vite"
    elif grep -q '"svelte"' package.json; then
        echo "  → Framework: Svelte / SvelteKit"
    elif grep -q '"react"' package.json; then
        echo "  → Framework: React"
    elif grep -q '"express"' package.json || grep -q '"fastify"' package.json; then
        echo "  → Framework: Node.js API (Express/Fastify)"
    else
        echo "  → Framework: Custom / Other Node.js project"
    fi
else
    echo "  → No package.json found in current working directory."
fi
echo ""

# 3. Inspect TypeScript & Tooling
echo "[3/6] Inspecting TypeScript & Tooling..."
if [ -f "tsconfig.json" ]; then
    echo "  → TypeScript: Configured (tsconfig.json found)"
else
    echo "  → TypeScript: Not configured"
fi

if [ -f "tailwind.config.js" ] || [ -f "tailwind.config.ts" ] || [ -f "tailwind.config.mjs" ]; then
    echo "  → Styling: Tailwind CSS configured"
else
    echo "  → Styling: Custom / Standard CSS"
fi

if [ -d "prisma" ] || [ -f "prisma/schema.prisma" ]; then
    echo "  → Database ORM: Prisma"
elif [ -f "drizzle.config.ts" ] || [ -f "drizzle.config.js" ]; then
    echo "  → Database ORM: Drizzle"
fi
echo ""

# 4. Git Repository Status
echo "[4/6] Inspecting Git Repository Status..."
if [ -d ".git" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    echo "  → Current Branch: $BRANCH"
    CHANGES=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
    echo "  → Uncommitted Files: $CHANGES"
else
    echo "  → Git: Not a git repository"
fi
echo ""

# 5. Check Scripts Availability in package.json
echo "[5/6] Checking package.json Available Scripts..."
if [ -f "package.json" ]; then
    for script in "dev" "build" "lint" "test" "typecheck"; do
        if grep -q "\"$script\":" package.json; then
            echo "  ✓ Script '$script' is defined"
        else
            echo "  - Script '$script' is missing"
        fi
    done
fi
echo ""

# 6. Overall Summary
echo "[6/6] Audit Complete."
echo "=========================================="
