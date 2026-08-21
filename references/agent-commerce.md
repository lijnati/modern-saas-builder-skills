# Agent Commerce, Autonomous Wallets & Machine-to-Machine Payments

## 1. The Agent Commerce Lifecycle

Giving an AI agent autonomous financial capabilities requires multi-layered authorization, risk modeling, and cryptographic proof:

```
┌─────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐     ┌─────────────┐
│  Agent  │ ──► │  Intent   │ ──► │  Budget   │ ──► │  Policy   │ ──► │ Risk Engine │
│ Request │     │ Parameter │     │   Check   │     │ Whitelist │     │ Simulation  │
└─────────┘     └───────────┘     └───────────┘     └───────────┘     └──────┬──────┘
                                                                             │
┌──────────────┐     ┌─────────────┐     ┌────────────┐     ┌──────────────┐ │
│ Immutable    │ ◄── │ Settlement  │ ◄── │ Execution  │ ◄── │ Authorization│ ◄┘
│ Audit Receipt│     │ (On-Chain)  │     │ (Broadcast)│     │ & Sign Key   │
└──────────────┘     └─────────────┘     └────────────┘     └──────────────┘
```

---

## 2. Spending Policies & Non-Negotiable Guardrails

Never give an LLM direct, unrestricted access to a funded private key.

### Mandatory Guardrail Rules:
1. **Per-Transaction Ceiling**: Strict max amount (e.g. max $5.00 USDC per single query/task).
2. **Velocity / Daily Spend Limits**: Hard limit reset every 24 hours (e.g. max $50.00 USDC per day).
3. **Recipient Whitelisting**: The agent may only transfer funds to pre-approved smart contract addresses or verified vendor endpoints.
4. **Human-in-the-Loop Threshold**: Any single transaction exceeding $50.00 or any interaction with an unverified contract pauses the agent and requires explicit human approval via Telegram/Slack/Email.

---

## 3. Policy-Enforced Agent Wallet Implementation

Use an off-chain policy wrapper or an ERC-4337 Account Abstraction smart account:

```typescript
// server/agent/wallet-guard.ts
import { parseUnits, type Address } from "viem";
import { db } from "@/server/db";

interface AgentSpendRequest {
  agentId: string;
  recipientAddress: Address;
  amountUsdc: number;
  reason: string;
  vendorId?: string;
}

export async function authorizeAndExecuteAgentPayment(req: AgentSpendRequest) {
  const agent = await db.agentWallet.findUnique({ where: { id: req.agentId } });
  if (!agent) throw new Error("Agent wallet not found");

  // 1. Check Per-Transaction Limit
  if (req.amountUsdc > agent.maxPerTxUsdc) {
    throw new Error(`Amount ($${req.amountUsdc}) exceeds per-transaction limit of $${agent.maxPerTxUsdc}`);
  }

  // 2. Check 24-Hour Rolling Velocity
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSpends = await db.agentTransaction.aggregate({
    where: { agentId: req.agentId, status: "completed", createdAt: { gte: oneDayAgo } },
    _sum: { amountUsdc: true },
  });

  const currentDailyTotal = (recentSpends._sum.amountUsdc || 0) + req.amountUsdc;
  if (currentDailyTotal > agent.dailyBudgetUsdc) {
    throw new Error(`Daily budget of $${agent.dailyBudgetUsdc} exceeded. Spent: $${currentDailyTotal}`);
  }

  // 3. Whitelist Verification
  const isWhitelisted = await db.whitelistedVendor.findFirst({
    where: { address: req.recipientAddress.toLowerCase() },
  });
  if (!isWhitelisted) {
    throw new Error(`Recipient address ${req.recipientAddress} is not in approved vendor whitelist`);
  }

  // 4. Simulate Transaction via RPC before signing
  // 5. Sign and Broadcast via Session Key
  const txHash = await executeRawTransfer(req.recipientAddress, req.amountUsdc);

  // 6. Record Immutable Audit Receipt
  return db.agentTransaction.create({
    data: {
      agentId: req.agentId,
      txHash,
      recipient: req.recipientAddress,
      amountUsdc: req.amountUsdc,
      reason: req.reason,
      status: "completed",
    },
  });
}
```

---

## 4. The x402 / HTTP 402 "Payment Required" Protocol

The standard protocol for autonomous agents buying API data and compute services:

```
Agent Client                          API Server / Vendor
     │                                        │
     │ 1. GET /api/v1/deep-research           │
     ├───────────────────────────────────────►│
     │                                        │
     │ 2. HTTP 402 Payment Required           │
     │    Headers:                            │
     │    x402-price: 0.05 USDC               │
     │    x402-recipient: 0xVendorAddress...  │
     │    x402-network: base                  │
     │    x402-nonce: non_987654321           │
     │◄───────────────────────────────────────┤
     │                                        │
     │ 3. Policy & Budget Verification        │
     │ 4. Broadcast on-chain transfer to Base │
     │                                        │
     │ 5. GET /api/v1/deep-research           │
     │    Headers:                            │
     │    x402-tx-hash: 0x9f8e7d6c...         │
     │    x402-nonce: non_987654321           │
     ├───────────────────────────────────────►│
     │                                        │ 6. Verify tx on Base RPC (amount, recipient, nonce)
     │                                        │ 7. Execute compute
     │ 8. HTTP 200 OK + Research Payload      │
     │◄───────────────────────────────────────┤
```

---

## 5. Financial Observability & Idempotency

- **Idempotency Keys**: Pass `Idempotency-Key: uuid` with every agent payment request to guarantee duplicate LLM retries never charge twice.
- **Real-Time Balance Alerts**: Trigger webhook notifications when an agent wallet balance drops below 20% of its daily operating threshold.
- **Cryptographic Receipts**: Store `txHash`, block timestamp, gas used, and vendor response signatures in queryable JSON logs for financial accounting and tax compliance.
