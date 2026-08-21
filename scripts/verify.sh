#!/usr/bin/env bash
# verify.sh - Automated project verification (typecheck, lint, test, build)
set -e

echo "=========================================="
echo "    RUNNING SAAS PROJECT VERIFICATION"
echo "=========================================="
echo ""

# Detect Runner
RUNNER="npm"
if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
    RUNNER="pnpm"
elif ([ -f "bun.lockb" ] || [ -f "bun.lock" ]) && command -v bun >/dev/null 2>&1; then
    RUNNER="bun"
elif [ -f "yarn.lock" ] && command -v yarn >/dev/null 2>&1; then
    RUNNER="yarn"
fi
echo "Using package runner: $RUNNER"
echo ""

ERRORS=0

# Step 1: TypeScript Typecheck
echo "[1/4] TypeScript Type Checking..."
if [ -f "tsconfig.json" ]; then
    if npx tsc --noEmit; then
        echo "  ✓ Type check passed."
    else
        echo "  ✗ Type check failed."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  - No tsconfig.json found, skipping."
fi
echo ""

# Step 2: Linter Check
echo "[2/4] Linter Verification..."
if [ -f "package.json" ] && grep -q '"lint":' package.json; then
    if $RUNNER run lint; then
        echo "  ✓ Lint passed."
    else
        echo "  ✗ Lint failed."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  - No 'lint' script found in package.json, skipping."
fi
echo ""

# Step 3: Test Suite
echo "[3/4] Automated Test Suite..."
if [ -f "package.json" ] && grep -q '"test":' package.json; then
    if $RUNNER test -- --run 2>/dev/null || $RUNNER test; then
        echo "  ✓ Tests passed."
    else
        echo "  ✗ Tests failed."
        ERRORS=$((ERRORS + 1))
    fi
elif [ -f "foundry.toml" ] && command -v forge >/dev/null 2>&1; then
    echo "  Running Foundry Smart Contract Tests..."
    if forge test; then
        echo "  ✓ Forge tests passed."
    else
        echo "  ✗ Forge tests failed."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  - No test suite detected, skipping."
fi
echo ""

# Step 4: Build Verification
echo "[4/4] Production Build Verification..."
if [ -f "package.json" ] && grep -q '"build":' package.json; then
    if $RUNNER run build; then
        echo "  ✓ Build succeeded."
    else
        echo "  ✗ Build failed."
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  - No 'build' script found in package.json, skipping."
fi
echo ""

# Summary
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "  🎉 ALL CHECKS PASSED. READY TO SHIP!"
    echo "=========================================="
    exit 0
else
    echo "  ⚠️  $ERRORS CHECK(S) FAILED. FIX BEFORE SHIPPING."
    echo "=========================================="
    exit 1
fi
