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

## Restaurant WhatsApp notifications

When an order is confirmed, the Arabic order message is sent to the restaurant
on WhatsApp (`0574672565` by default). The send happens **after** the HTTP
response, so it can never slow down or fail a customer's checkout — the order is
already in Postgres before the first byte of the message leaves.

Code: [`lib/whatsapp.ts`](lib/whatsapp.ts) (the channel),
[`lib/notify.ts`](lib/notify.ts) (channel selection + message formatting),
[`app/api/orders/route.ts`](app/api/orders/route.ts) (the `after()` call).

### Why the Cloud API and not Twilio

We call Meta's WhatsApp Cloud API directly.

- **Cost.** Twilio bills its own per-message fee on top of Meta's charge. Going
  direct pays Meta only — see "What it costs" below.
- **Dependencies.** Direct is one `fetch` to `graph.facebook.com`. Twilio means
  another account, another SDK, another status page in the failure path.
- **Nothing is actually easier with Twilio here.** Its main selling points are
  multi-channel fallback (SMS if WhatsApp fails) and not touching Meta's
  console. We only want WhatsApp, and Meta's console is a one-time visit.

Twilio is the better choice if you later want SMS fallback when WhatsApp is
down, or several restaurants with separate numbers and per-branch routing. The
`OrderNotifier` interface exists so that swap is one new file.

### What it costs

- **The Cloud API itself is free.** Meta charges no platform or hosting fee;
  you pay only for messages. There is no minimum and no subscription.
- **Utility template messages are billed per message**, at a per-country rate.
  Saudi Arabia's utility rate is a low single-digit US-cent figure, so a
  restaurant doing a few hundred orders a month lands in the low single-digit
  dollars. Meta changes these rates, so read the current number off the
  official rate card rather than trusting this paragraph:
  <https://developers.facebook.com/docs/whatsapp/pricing>
- **Free in two cases:** anything sent inside an open 24-hour customer service
  window, and (as of this writing) service/free-form messages generally. Since
  our sends are unprompted, assume you are paying the utility rate.
- **Twilio, for comparison,** charges its own per-message fee on top of that
  same Meta charge. It roughly doubles a small bill and adds a monthly minimum
  on some plans.

Budget for it as a rounding error, not as a line item — but do put a payment
method on the Business account, because sends fail once the account hits its
credit limit.

### What you need to set up

1. **Meta Business account** — [business.facebook.com](https://business.facebook.com).
   You need a verified business to send outside test mode.
2. **App** — [developers.facebook.com](https://developers.facebook.com) → *Create
   App* → type **Business** → add the **WhatsApp** product.
3. **Sender number.** WhatsApp → *API Setup* gives you a free test number that
   can only message up to 5 numbers you list by hand, which is fine for
   development. For production, register a real number you own as the sender.
   **It must not already be on the regular WhatsApp app** — a number can only be
   in one place. Do not use `0574672565` as the sender; that is where the
   messages are going.
4. **Copy the Phone number ID** (not the phone number itself) into
   `WHATSAPP_PHONE_NUMBER_ID`.
5. **Permanent token.** The token shown on the API Setup page expires in 24
   hours. Business Settings → *System Users* → add a system user → assign your
   app with **Full control** → *Generate token* with the `whatsapp_business_messaging`
   and `whatsapp_business_management` scopes → set expiry to **Never**. That
   value goes in `WHATSAPP_ACCESS_TOKEN`.
6. **Add `0574672565` as a recipient** while you are on the test number (API
   Setup → *To* → *Manage phone number list*). The restaurant has to accept the
   verification code once. Not needed once you have a real registered sender.
7. **Message template** — see below. Do this before go-live.

Then fill in `.env.local` from `.env.example` and restart. With no
`WHATSAPP_*` variables set the app logs a warning at startup and falls back to
writing orders to the server log, exactly as before.

### The 24-hour window, and why you want a template

WhatsApp only allows free-form text to someone who messaged your business
number in the last 24 hours. The restaurant will never be messaging us, so
free-form sends start failing (error `131047`) as soon as that window lapses —
typically the morning after you tested it and concluded it worked.

An **approved template** has no such limit. Set `WHATSAPP_TEMPLATE_NAME` and we
send that instead. Create it under WhatsApp Manager → *Message templates*:

- **Category:** Utility (not Marketing — Utility is cheaper and approved faster)
- **Language:** Arabic (`ar`), matching `WHATSAPP_TEMPLATE_LANG`
- **Body** — exactly seven variables, in this order:

```
🔔 طلب جديد — مطعم دمس
رقم الطلب: {{1}}
الاسم: {{2}}
الجوال: {{3}}
الاستلام: {{4}}
الأصناف: {{5}}
الإجمالي: {{6}} ريال
ملاحظات: {{7}}
الدفع: عند الاستلام 💵
```

Approval usually takes minutes. Meta requires sample values for each variable
when you submit.

The order lines are flattened onto one line for `{{5}}` (`اسم × 2 ، اسم × 1`)
because template variables cannot contain newlines. The full multi-line message
is still stored on the order and returned by `GET /api/orders/:id`.

### Failure behaviour

A notification failure never affects the customer. In order:

1. The order is written to Postgres and the `201` is returned.
2. `after()` runs the send once the response is flushed.
3. On a timeout, `429`, or `5xx`, it waits 1s and retries **once**. A `401`
   (bad token) or `131047` (window lapsed) is not retried — it needs a human,
   and a second attempt only doubles the log noise.
4. If both attempts fail, the error *and the full undelivered message* are
   logged, so the order can be read off the logs and phoned through.

The customer sees the success page regardless.

### Testing it

```bash
curl -X POST http://localhost:3000/api/orders -H 'Content-Type: application/json' -d '{"items":[{"itemId":"box-01","quantity":2}],"customerName":"تجربة","customerPhone":"0551234567","fulfilment":"pickup"}'
```

Point `WHATSAPP_TO` at your own mobile first. Watch the server log for
`[whatsapp]` lines.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
