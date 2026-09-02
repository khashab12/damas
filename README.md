This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Restaurant notifications (Telegram)

When an order is confirmed, the Arabic order message is sent to a Telegram
chat. The send happens **after** the HTTP response, so it can never slow down
or fail a customer's checkout — the order is in Postgres before the message
leaves.

Telegram was chosen over WhatsApp deliberately: no business verification, no
template approval, no 24-hour messaging window, and no per-message cost. A bot
can message its chat whenever it likes, forever. It is also free with no
account beyond a normal Telegram one.

Code: [`lib/telegram.ts`](lib/telegram.ts) (the channel),
[`lib/notify.ts`](lib/notify.ts) (channel selection + message formatting),
[`app/api/orders/route.ts`](app/api/orders/route.ts) (the `after()` call).

### Creating the bot and finding the chat id

1. Open Telegram and message **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot`. Give it a display name (`مطعم دمس`) and a username ending
   in `bot` (e.g. `damas_orders_bot`).
3. BotFather replies with the token — `8123456789:AAH...`. That is
   `TELEGRAM_BOT_TOKEN`. Treat it like a password; anyone holding it can post
   as the bot.
4. Create a Telegram **group** for the restaurant's staff and add the bot to
   it. A group beats a private chat: everyone on shift sees the order, staff
   can come and go, and nothing is tied to one person's phone.
5. Send any message in that group, then open:

   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```

   Find `"chat":{"id":-1002345678901,...}` in the JSON. That number, **minus
   sign included**, is `TELEGRAM_CHAT_ID`.

   If `getUpdates` returns an empty list, it is almost always group privacy
   mode: in BotFather, `/mybots` → your bot → *Bot Settings* → *Group Privacy*
   → **Turn off**, then remove and re-add the bot to the group and post again.

6. Put both values in `.env.local` (copy `.env.example`) and restart.

With the variables unset the app logs a warning at startup and writes orders to
the server log instead. Nothing fails, and every order is still on the
dashboard.

### Failure behaviour

A notification failure never affects the customer. In order:

1. The order is written to Postgres and the `201` is returned.
2. `after()` runs the send once the response is flushed.
3. On a timeout, `429`, or `5xx`, it waits and retries **once**. On a 429
   Telegram's own `retry_after` is honoured, unless it is longer than the
   request budget. A `401` (bad token) or `400` ("chat not found") is not
   retried — it needs a human, and a second attempt only doubles the log noise.
4. If both attempts fail, the error *and the full undelivered message* are
   logged, so the order can be read off the logs and phoned through.

The customer sees the success page regardless, and the order is on the
dashboard either way — Telegram is the alert, not the system of record.

## Orders dashboard (`/admin/orders`)

The durable view of orders: newest first, with order number, time, customer
name, tap-to-call phone, delivery/pickup, address, items with quantities,
total, and any note.

- **Auto-refreshes every 15s** and immediately when a backgrounded tablet is
  looked at again.
- **Sound alert on a new order.** Browsers block audio until the user
  interacts, so the alert must be switched on once per page load with the
  «تفعيل صوت التنبيه» button — the page says so when it is off.
- **Status**: mark each order متحضر then تم التسليم. Persisted in Postgres, so
  it survives reloads, restarts and a different device.
- **Filter**: today (default) or all. "Today" means today in Riyadh, not in the
  server's timezone.
- Arabic RTL, brand tokens, 44px tap targets, laid out for a tablet.

### Access

Set `ADMIN_PASSWORD` and share it with the staff. It is a single shared
password — not a user system — because the shop has one tablet and per-user
logins are ceremony nobody performs.

The check is entirely server-side. The page is a Server Component that reads
orders *only after* the session cookie validates, so an unauthenticated
visitor is never sent the data at all; `/api/admin/orders` re-checks on every
request. The cookie holds an HMAC derived from the password, never the
password, so changing `ADMIN_PASSWORD` invalidates every session immediately.

**With `ADMIN_PASSWORD` unset the dashboard is locked, not open.** It fails
closed on purpose.

`/admin` and `/api/admin` are `noindex, nofollow` and disallowed in
`robots.txt`. That is hygiene, not the security control — the password is.

### Order status migration

The dashboard added `confirmed` / `prepared` / `delivered` to the existing
`status` column. The migration in
[`lib/orders/schema.sql`](lib/orders/schema.sql) is additive and idempotent:
`ADD COLUMN IF NOT EXISTS` plus a guarded `CHECK` constraint. Existing rows
keep their data and default to `confirmed`. Nothing is dropped, and it re-runs
safely on every cold start.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
