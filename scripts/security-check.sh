#!/usr/bin/env bash
# security-check.sh - Advisory security auditor for SaaS codebases
set -e

echo "=========================================="
echo "      ADVISORY SAAS SECURITY AUDIT"
echo "=========================================="
echo "Note: This is a static heuristic check. It does not replace full security reviews."
echo ""

WARNINGS=0

# 1. Check for unignored .env files
echo "[1/4] Checking for Exposed Environment Files..."
if [ -d ".git" ]; then
    COMMITTED_ENVS=$(git ls-files | grep -E '^\.env(\.local|\.production|\.development)?$' || true)
    if [ -n "$COMMITTED_ENVS" ]; then
        echo "  ⚠️  WARNING: Found .env file(s) tracked in git:"
        echo "$COMMITTED_ENVS"
        echo "     Remove them with 'git rm --cached <file>' and add to .gitignore."
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  ✓ No sensitive .env files tracked in git."
    fi
else
    echo "  - Not a git repository, skipping git file check."
fi
echo ""

# 2. Check for Hardcoded Secrets & Private Key Patterns
echo "[2/4] Scanning for Obvious Hardcoded Secrets..."
FOUND_SECRETS=$(grep -rnE '(sk_live_[0-9a-zA-Z]{24}|ghp_[0-9a-zA-Z]{36}|BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY|0x[a-fA-F0-9]{64})' \
    --exclude-dir={.git,node_modules,.next,dist,build,coverage,references} \
    --exclude={"*.lock","*.lockb","package-lock.json","pnpm-lock.yaml"} . 2>/dev/null || true)

if [ -n "$FOUND_SECRETS" ]; then
    echo "  ⚠️  WARNING: Potential hardcoded secret or private key pattern detected:"
    echo "$FOUND_SECRETS" | head -n 5
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✓ No obvious secret key patterns detected."
fi
echo ""

# 3. Check for Dangerous JavaScript/TypeScript Patterns
echo "[3/4] Scanning for Risky Patterns (eval, dangerouslySetInnerHTML without sanitization)..."
RISKY_PATTERNS=$(grep -rnE '(dangerouslySetInnerHTML|eval\(|new Function\()' \
    --exclude-dir={.git,node_modules,.next,dist,build,coverage} \
    --exclude={"*.test.ts","*.spec.ts","*.test.tsx","*.spec.tsx"} . 2>/dev/null || true)

if [ -n "$RISKY_PATTERNS" ]; then
    echo "  ⚠️  NOTICE: Detected raw DOM manipulation or eval pattern (ensure input is sanitized with DOMPurify):"
    echo "$RISKY_PATTERNS" | head -n 5
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✓ No dangerous eval/raw innerHTML patterns found in app source."
fi
echo ""

# 4. Dependency Vulnerability Audit
echo "[4/4] Checking Dependency Security Audit..."
if [ -f "package.json" ]; then
    if command -v npm >/dev/null 2>&1; then
        echo "  Running 'npm audit' (level: high)..."
        npm audit --audit-level=high 2>/dev/null || echo "  ⚠️  Some vulnerabilities found in dependencies. Run 'npm audit fix'."
    elif command -v pnpm >/dev/null 2>&1; then
        echo "  Running 'pnpm audit'..."
        pnpm audit 2>/dev/null || true
    fi
else
    echo "  - No package.json found, skipping."
fi
echo ""

# Summary
echo "=========================================="
if [ $WARNINGS -eq 0 ]; then
    echo "  ✓ ADVISORY SCAN CLEAN. Zero obvious high-risk issues found."
else
    echo "  ⚠️  $WARNINGS POTENTIAL SECURITY RISK(S) FLAGGED. REVIEW BEFORE LAUNCH."
fi
echo "=========================================="
