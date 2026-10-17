# Learning the Kroger API (for Rick)

You asked to learn this, not just have it done. Each step below says **what it is**, **what you do**, and **where the code does it**.

## The big picture

```
Phone app ──(your login)──▶ Supabase Edge Function ──(secret keys)──▶ Kroger API
                                   │                                     │
                                   └──── Claude API (writes the recipe)   └── stores, products, prices, aisles
```

The phone never sees the Kroger or Claude keys. Anyone can unpack an app and read keys stored inside it. So the app calls **our** function (`supabase/functions/recipe`). That function holds the secrets and calls Kroger.

## Step 1: Make a Kroger developer app (about 5 minutes, you do this)

1. Go to **developer.kroger.com** and sign up (free).
2. Click **Create App** (under "My Apps").
   - **Name:** Frankly
   - **Environment:** Production (Certification is a fake sandbox with no real prices).
   - **Scopes:** check **Product** (`product.compact`). That's all we need. Locations don't need a scope.
   - **Redirect URI:** if it asks, use `http://localhost`. We don't use it; it's only for logging in as a shopper.
3. You'll get a **Client ID** and a **Client Secret**. Treat the secret like a password: never paste it in the repo, Discord or a screenshot.
4. Save them as Supabase secrets (see "Setup" in `HANDOFF.md`):

```bash
npx supabase secrets set KROGER_CLIENT_ID=your-id KROGER_CLIENT_SECRET=your-secret
```

## Step 2: Get an access token (client credentials)

**What it is:** Kroger won't accept your secret on every request. Instead you trade your ID and secret for a temporary **access token** that lasts about 30 minutes. This is called the OAuth2 **client credentials** flow ("I'm an app, not a person").

**What the request looks like:**

```
POST https://api.kroger.com/v1/connect/oauth2/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=product.compact
```

Kroger answers with `{ "access_token": "...", "expires_in": 1800 }`.

**In our code:** `krogerToken()` in `supabase/functions/_shared/kroger.ts`. It also **caches** the token, so we don't ask for a new one on every request.

## Step 3: Find stores near the user (Locations API)

**What it is:** Prices are different at every store, so first we need store IDs.

```
GET https://api.kroger.com/v1/locations?filter.zipCode.near=98105&filter.radiusInMiles=15&filter.limit=10
Authorization: Bearer ACCESS_TOKEN
```

You can also send `filter.latLong.near=47.66,-122.30` (that's what "Use my location" does). Each store comes back with a `locationId`, a `chain` (QFC, FRED…), an address and coordinates.

**In our code:** `findStores()` in `kroger.ts`, called by `supabase/functions/kroger-stores`. That function:
- turns a zip code into coordinates with OpenStreetMap (free) so we can measure distance,
- picks the nearest store from each chain, so you compare QFC vs Fred Meyer, up to 3 stores,
- saves them on the user's profile (`kroger_stores`).

## Step 4: Search products and prices (Products API)

**What it is:** Search a store's shelf. **Prices only come back if you pass `filter.locationId`.**

```
GET https://api.kroger.com/v1/products?filter.term=chicken%20thighs&filter.locationId=70500822&filter.limit=8
Authorization: Bearer ACCESS_TOKEN
```

The parts we use from each product:
- `description`: "Kroger Boneless Skinless Chicken Thighs"
- `items[0].size`: "1.5 lb"
- `items[0].price.regular` and `items[0].price.promo` (promo is the sale price, 0 if there's no sale)
- `aisleLocations[0]`: "Aisle 12". This powers the ingredient **location button**.

**In our code:** `searchProducts()` in `kroger.ts`.

## Step 5: Turn search results into a shopping list (our own logic)

Kroger only gives you search results. Deciding *which* product and *how many* is our job. All of it is in `supabase/functions/_shared/pricing.ts`, which has tests (`npx tsx scripts/test-pricing.ts`):

1. **Claude says what's needed**, never prices. For example: "chicken thighs, 900 g, search 'boneless chicken thighs', must include 'thigh', exclude 'breaded'".
2. **`relevant()`** throws out wrong matches, so "garlic" never picks garlic salt.
3. **`parseSize()`** reads sizes like "1.5 lb", "64 fl oz", "12 ct" or "6 ct / 12 fl oz".
4. **`packagesNeeded()`** works out how many packages cover the amount.
5. **`choose()`** picks the cheapest way to buy it. If you asked for **lots** of leftovers, it picks the best price per ounce instead, which usually means bigger packs.
6. **`recommend()`** totals each store and recommends the cheapest one that carries the most items. It also writes the sentence explaining why.

## Step 6: Call it from the app

The app never talks to Kroger. It calls our function:

```ts
supabase.functions.invoke('recipe', { body: { dish, servings, budget, leftovers } })
```

See `generateRecipe()` in `src/lib/api.ts`.

## Limits and gotchas

- **Rate limits:** the Products API allows about 10,000 calls a day. One recipe uses roughly 30–40 calls (each ingredient × 3 stores, plus swaps), so a day of demoing is fine. We run at most 8 calls at once and retry when Kroger says "slow down" (HTTP 429).
- **Kroger-family stores only:** QFC, Fred Meyer, Kroger, Ralphs and so on. Costco and Trader Joe's aren't in this API.
- **Some items aren't found** at a store. The app shows "not found" and the store comparison counts them, so a store doesn't look cheaper just because it's missing things.
- **Prices change.** The recipe screen shows the time prices were checked.
