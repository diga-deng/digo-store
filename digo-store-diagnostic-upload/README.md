# DIGO Store

A simple upload-and-sell ecommerce starter:

- Admin uploads a product image, name, price, and description.
- Products appear on the storefront.
- Customers add products to cart.
- Stripe Checkout takes payment.
- Stripe webhook records paid orders in Supabase.

## 1. Create Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy these values into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Create Stripe

1. Create a Stripe account.
2. Copy your secret key into `STRIPE_SECRET_KEY`.
3. After deployment, create a webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Event: `checkout.session.completed`
4. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 3. Local setup

Copy `.env.example` to `.env.local`, then fill in the values.

```bash
pnpm install
pnpm dev
```

Open:

- Storefront: `http://localhost:3000`
- Admin upload page: `http://localhost:3000/admin`

The admin page uses `ADMIN_SECRET` from `.env.local` as its password.

## 4. Deploy

1. Push the project to GitHub.
2. Import it into Vercel.
3. Add every `.env.local` value as a Vercel environment variable.
4. Set `NEXT_PUBLIC_SITE_URL` to your real domain.
5. Add the Stripe webhook after Vercel gives you a production URL.

## Notes

This is an MVP admin flow. It is protected by a shared admin password, which is fine for a first private launch. For a larger team, replace it with Supabase Auth or a proper admin login.


## Payment integration setup and verification

See [PAYMENT_SETUP.md](PAYMENT_SETUP.md) for test-only Stripe configuration, the exact webhook URL, and end-to-end acceptance checks.

## Scene-first experience

The production homepage is the approved DIGO scene experience, served at `/` by
an internal rewrite to `public/scene-experience/index.html`. All scripts, styles
and compressed images are hosted on the same domain. The existing `/shop`,
`/products/[slug]`, `/checkout`, admin and payment API routes remain available.

- Vertical swipes change scenes; horizontal swipes move through Discover,
  interested scenes, viewed concept pieces and My World. Four bottom icons also
  provide direct access. A transparent hand introduces gestures on the first visit.
- Scene edits, saves, interests and the guide are local to this browser, under
  `digo-world-v1`. Simply swiping does not create an interest signal.
- Scene photography and the six concept objects are illustrative. They cannot
  be added to the real cart. Concept price estimates only support scene planning.
- `production.js` connects the real `digo-cart-v3` shopping bag, current product
  search through `/api/catalog`, and the existing checkout. Actual catalog
  products retain their original pricing, reservation and payment rules.
- `/api/catalog` returns only allowlisted public fields, excluding supplier costs.
- Existing payment configuration and live-payment restrictions are unchanged.

Run `npm ci`, `npm test`, and `npm run build` before deploying. The suite includes
payment integrity, gesture intent/history and concept-versus-commerce checks.

## Language models

`lib/model.ts` lets server code call a language model. One thing shoppers see
uses it: describing their shape in the fitting room (below).

- One group of Vercel variables per model, up to five, tried in order:
  `DIGO_MODEL_1_NAME`, `DIGO_MODEL_1_URL` (a full OpenAI-compatible chat
  completions address), `DIGO_MODEL_1_KEY`, `DIGO_MODEL_1_MODEL`, and the
  optional `DIGO_MODEL_1_EXTRA` (JSON merged into the request). Changing
  provider means changing variables, not code. See `.env.example`.
- Keys stay on the server. They are never sent to the browser or returned by an API.
- To check the connection, send the admin password to `/api/admin/model`:
  `GET` lists the connected models; `POST` asks each one a short fixed question
  and reports which answered, how long it took, and any error from the provider.

  ```bash
  curl -X POST https://digo-store-diagnostic.vercel.app/api/admin/model -H "x-admin-secret: <admin password>"
  ```
- Sizes are still decided by the size chart in
  `public/scene-experience/fitting-shape.js`, whose numbers are placeholders
  until each brand supplies its real chart. A model must not decide a size.

### Describing your shape in the fitting room

While setting their shape, a shopper can press "Describe yourself instead" and
say it in words (height, weight, where weight sits, arms, chest). `/api/fit`
passes this to the model, which proposes the figure's numbers; the figure
changes, the shopper corrects anything by hand, and presses Done. The size then
comes from the size chart as before.

- The button only appears when a model is connected.
- Before the first message the shopper is told that what they type, and the
  figure's shape, go to the language model provider. Nothing is stored by the
  store's server. The saved shape stays on the device, as before.
- The shape now has nine numbers: width for shoulders, chest, belly, hips and
  legs; upper arm; and front-to-back depth for chest, belly and hips. Depth
  adds half its change to that measurement. Arms and depth are recorded but
  not drawn: the photograph is a front view. Arms are not yet used for size.
- The model's answer is never trusted: only the nine numbers are kept, each
  limited to 85–120, and anything unreadable is refused. The model is told not
  to name a size, and the provider's error text is not shown to shoppers.
- Each visitor gets 20 messages an hour and the site 600. This is counted in
  memory per server instance, so it slows abuse but is not a hard budget; set a
  spending cap with the provider as well.
- Not verified: how well the model's numbers match real bodies. There is no
  measured data behind "a bit of a belly" yet, and the base measurements and
  size chart are placeholders. Treat the result as a starting point the shopper
  confirms, and collect real measurements before relying on it.
