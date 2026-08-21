# AI Application Architecture, Agents & Tool Calling

## 1. The Autonomous Agent Mental Model

Never allow AI models to execute unstructured, unvalidated actions directly against production databases or external APIs.

```
┌─────────┐     ┌───────────┐     ┌────────────┐     ┌───────────┐
│ Intent  │ ──► │ AI Agent  │ ──► │  Security  │ ──► │   Tool    │
│ (Prompt)│     │ Reasoning │     │   Policy   │     │ Schema    │
└─────────┘     └───────────┘     └────────────┘     └─────┬─────┘
                                                           │
┌─────────┐     ┌───────────┐     ┌────────────┐           ▼
│  Audit  │ ◄── │ Execution │ ◄── │ Validation │ ◄─────────┘
│   Log   │     │ & Result  │     │   (Zod)    │
└─────────┘     └───────────┘     └────────────┘
```

---

## 2. Model Selection & Dynamic Routing

Optimize for both response latency and operational cost by routing tasks to the appropriate model tier:

| Tier | Example Models | Use Case | Latency / Cost Profile |
|---|---|---|---|
| **Tier 1 (Fast / Routing)** | Gemini Flash, Claude 3.5 Haiku, GPT-4o-mini | Intent classification, routing, entity extraction, summarization, guardrail checks. | <500ms / $0.15 per 1M tokens |
| **Tier 2 (Deep Reasoning)** | Gemini Pro, Claude 3.5 Sonnet, GPT-4o | Multi-step agent planning, complex code generation, document synthesis, financial analysis. | 1–3s / $3.00 per 1M tokens |

---

## 3. Strict Structured Outputs with Zod

Enforce deterministic schema validation on every model response:

```typescript
import { z } from "zod";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

export const ExtractionSchema = z.object({
  companyName: z.string(),
  invoiceNumber: z.string(),
  totalAmount: z.number().positive(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number(),
    })
  ),
});

export async function parseInvoiceDocument(rawText: string) {
  const { object } = await generateObject({
    model: google("gemini-1.5-pro"),
    schema: ExtractionSchema,
    prompt: `Extract structured invoice details from this text:\n\n${rawText}`,
  });

  return object; // Guaranteed type-safe ExtractionSchema object
}
```

---

## 4. Safe Tool Calling & Human-in-the-Loop (HITL)

Categorize tools by risk level:
- **Read-Only / Idempotent Tools** (`searchDatabase`, `fetchWeather`, `calculateTax`): Execute autonomously.
- **Destructive / Financial Tools** (`sendInvoiceEmail`, `transferFunds`, `deleteRecords`): Require explicit Human-in-the-Loop (HITL) confirmation or tight safety bounds.

```typescript
// Example Tool Definition with Built-in Policy Checks
export const sendEmailTool = {
  description: "Sends an email to a customer.",
  parameters: z.object({
    recipient: z.string().email(),
    subject: z.string().max(100),
    body: z.string(),
  }),
  execute: async ({ recipient, subject, body }: { recipient: string; subject: string; body: string }, { session }: any) => {
    // 1. Policy check
    if (!recipient.endsWith("@trusted-domain.com")) {
      return { status: "rejected", reason: "Recipient domain unauthorized" };
    }
    // 2. Execute via transactional provider
    await resend.emails.send({ from: "team@saas.com", to: recipient, subject, text: body });
    return { status: "sent", timestamp: new Date().toISOString() };
  },
};
```

---

## 5. Context Management & Memory

- **Sliding Window Memory**: Keep the system prompt + last 6-10 conversation turns in immediate context.
- **Summarization**: When token usage exceeds 70% of the target context window, invoke a fast model (Tier 1) to summarize prior turns into a `conversationSummary` block.
- **Hybrid RAG (Dense + Keyword)**: Use PostgreSQL `pgvector` for semantic embeddings + `tsvector` for keyword search to retrieve relevant documentation.

---

## 6. Security, Prompt Injection & Guardrails

1. **System Prompt Delimiters**: Wrap untrusted user inputs inside distinct XML or markdown blocks:
   ```
   You are an assistant. Answer questions strictly based on the context below.
   <context>
   {{untrustedUserProvidedDocument}}
   </context>
   ```
2. **Output Sanitization**: Scan outputs for leaked API keys, system instructions, or sensitive PII before rendering in client interfaces.
3. **Audit Trails**: Log every tool invocation, input parameters, model latency, and token consumption to an immutable audit database table.
