# AI Observability, Evals & Reliability Playbook

Modern AI-enabled SaaS applications require specialized instrumentation to monitor token economics, model drift, latency, and response quality.

---

## 1. Core Architecture for AI Features

```
Client → API Gateway → Token Rate-Limiter → Circuit Breaker → LLM Provider
                                                   ↓
                                         Langfuse / Helicone (Tracing & Evals)
```

### The Iron Rules of Production AI
1. **Never Call LLMs Directly from the Client**: Always route through backend endpoints with authenticated user sessions and rate limits.
2. **Stream by Default**: Use Server-Sent Events (SSE) or WebSockets to minimize Time-to-First-Token (TTFT).
3. **Structured Outputs over Freeform Parsing**: Use JSON schema enforcement or tool calling (`response_format: { type: 'json_object' }`).
4. **Instrument Every Generation**: Log input tokens, output tokens, latency, cost in USD, and user feedback (thumbs up/down).

---

## 2. LLM Tracing & Observability

### Recommended Tools
* **Langfuse**: Open-source, self-hostable or cloud, deep tracing, prompt management, and automated evaluation metrics.
* **Helicone**: Proxy-based zero-code instrumentation, caching, rate limiting, and cost analytics.

### Minimal Langfuse Next.js Integration
```typescript
import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
});

// Trace execution
export async function executeAiWorkflow(userId: string, orgId: string, prompt: string) {
  const trace = langfuse.trace({
    name: 'summarization_workflow',
    userId,
    metadata: { organizationId: orgId },
  });

  const generation = trace.generation({
    name: 'llm_completion',
    model: 'gpt-4o-mini',
    input: prompt,
  });

  try {
    const response = await callLlmProvider(prompt);
    generation.end({
      output: response.text,
      usage: {
        input: response.inputTokens,
        output: response.outputTokens,
      },
    });
    return response.text;
  } catch (error: any) {
    generation.end({ level: 'ERROR', statusMessage: error.message });
    throw error;
  }
}
```

---

## 3. Automated Prompt Regression & Evals

Before shipping prompt changes to production:

1. **Golden Dataset**: Maintain a dataset of 30–50 representative input cases covering edge cases, adversarial inputs, and typical usage.
2. **LLM-as-a-Judge Evaluation**:
   * **Relevance**: Did the model answer the specific prompt? (1-5 scale)
   * **Hallucination Rate**: Are claims grounded in provided context documents?
   * **Format Adherence**: Did the output match the required JSON schema?
3. **CI/CD Eval Gate**: Fail pull requests if eval pass rate drops below 95%.

---

## 4. Cost Control & Fallback Strategies

* **Semantic Caching**: Cache responses for repetitive queries using Redis Vector or Upstash Semantic Cache.
* **Graceful Degradation / Model Cascading**:
  1. Try lightweight/fast model (e.g. `gpt-4o-mini`, `claude-3-5-haiku`, `gemini-1.5-flash`).
  2. Fall back to frontier models (`gpt-4o`, `claude-3-5-sonnet`) only when evaluation score or confidence is low.
* **Circuit Breaker**: Detect 429 / 503 upstream errors and automatically reroute to backup LLM providers.
