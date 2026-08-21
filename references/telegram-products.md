# Telegram-Native SaaS, Bots & Telegram Mini Apps (TMA)

## 1. Telegram as an Application Platform

Telegram is a distribution powerhouse with 900M+ active users, zero app-store 30% fees (for web mini-apps), instant authentication, and built-in push notifications.

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Ecosystem                       │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   grammY Bot Layer    │       │  Telegram Mini App    │  │
│  │   - Commands & Menus  │       │  (Next.js / React)    │  │
│  │   - Push Broadcasts   │◄─────►│  - Rich Interactive UI│  │
│  │   - State Machines    │       │  - Verified initData  │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
└──────────────┼───────────────────────────────┼──────────────┘
               ▼                               ▼
       Postgres Database ◄─────────────► Backend REST API
```

---

## 2. Bot Development with grammY

**grammY** is the TypeScript-first standard for Telegram Bot development.

### Production Webhook Handler with Secret Token
Never use long polling in serverless production. Use webhooks with secret token validation:

```typescript
// app/api/telegram/webhook/route.ts (Next.js Route Handler)
import { Bot, webhookCallback } from "grammy";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command("start", async (ctx) => {
  const payload = ctx.match; // Deep link payload (e.g. `ref_123`)
  await ctx.reply(`Welcome to SaaS Bot! 🚀`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Open App 📱", web_app: { url: process.env.NEXT_PUBLIC_APP_URL! } }],
        [{ text: "Upgrade to Pro 💳", callback_data: "upgrade_plan" }],
      ],
    },
  });
});

export async function POST(req: Request) {
  const secret = headers().get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return webhookCallback(bot, "std/http")(req);
}
```

---

## 3. Telegram Mini Apps (TMA): Secure initData Validation

When a user opens a Mini App, Telegram passes a signed `initData` string. You **MUST** validate this cryptographically using HMAC-SHA256 before trusting the user identity:

```typescript
// server/auth/telegram-tma.ts
import crypto from "crypto";

export function validateTelegramWebAppData(initDataString: string, botToken: string) {
  const params = new URLSearchParams(initDataString);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");

  // Sort parameters alphabetically
  const dataCheckString = Array.from(params.entries())
    .map(([key, val]) => `${key}=${val}`)
    .sort()
    .join("\n");

  // Secret key = HMAC-SHA256 of botToken with "WebAppData"
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (calculatedHash !== hash) {
    return null; // Tampered or invalid signature
  }

  const user = JSON.parse(params.get("user") || "{}");
  return {
    id: user.id.toString(),
    firstName: user.first_name,
    username: user.username,
    authDate: Number(params.get("auth_date")),
  };
}
```

---

## 4. Telegram UI & UX Guidelines

- **Viewport Expansion**: Always call `window.Telegram.WebApp.expand()` immediately upon load.
- **Theme Synchronization**: Use CSS variables mapped to Telegram theme colors (`--tg-theme-bg-color`, `--tg-theme-button-color`).
- **Haptic Feedback**: Trigger `Telegram.WebApp.HapticFeedback.impactOccurred('light')` on button taps.
- **MainButton**: Utilize Telegram's native bottom action button for primary checkout and submit actions.

---

## 5. Broadcasts & Rate Limiting

Telegram strictly enforces a limit of **30 messages per second** globally across all users for a bot.

### Safe Broadcast Rules:
1. **Background Worker Queues**: Push broadcast tasks into a BullMQ or Inngest queue with rate-limiting set to `25 jobs/second`.
2. **Handle 403 Forbidden (Blocked Bot)**:
   ```typescript
   try {
     await bot.api.sendMessage(chatId, message);
   } catch (error: any) {
     if (error.error_code === 403) {
       // User blocked the bot. Mark user as `isBotBlocked = true` in database to prevent wasted API calls.
       await db.telegramUser.update({ where: { chatId }, data: { isBlocked: true } });
     }
   }
   ```
