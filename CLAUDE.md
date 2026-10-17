# Frankly — DubHacks 2026

Read this first, then `HANDOFF.md` (status + change log), then **`docs/MVP.md` (source of truth for what to build)** and `docs/DECISIONS.md` (open questions; only build what's Approved). `docs/IDEA.md` is the older rough idea.

**The team's rule: run any suggestion past them before building it.** Don't add features or change the flow on your own; propose it in `docs/DECISIONS.md` and ask.

Two people (Rick and his partner, GitHub `awan2025-bobo`) build this together, each with their own Claude account. **Claude memory is not shared between accounts**, so this file and `HANDOFF.md` are the only shared context. Keep them current.

## The event

- DubHacks 2026, University of Washington, **Sat Oct 17 – Sun Oct 18, 2026**.
- Theme: **"Let's Get Cookin'!"**
- **Submissions due Sun Oct 18, 10:30 AM** on Devpost. Make the repo public before submitting.
- All app code must be written during the event (past years' rule).
- **Track chosen: Cook Smarter** (AI agents, planning, data management). Rubric: Functionality 30%, Track applicability 30%, Design 20%, Creativity 20%. Full rubric in `docs/IDEA.md`.

## The app

An AI recipe-planning and grocery-optimization app. Onboarding (under a minute, optional questions skippable) captures household, taste sliders, cuisines, diet, allergens, appliances and usual stores. Five tabs: Active Recipe, Cookbook (Saved + Cooked "books"), Home ("What would you like to cook today?"), "Don't know what to make?", Profile. The agent builds a recipe within budget, prices it with **live Kroger prices** at nearby Kroger-family stores (QFC, Fred Meyer), suggests cheaper swaps, remembers staples (pantry is internal only, no pantry screen), and stores feedback + cooked dates to improve future suggestions. Full spec: `docs/MVP.md`.

**Status:** first demo built (see `HANDOFF.md`). Not yet run against live services. Deferred ideas are under "Later" in `docs/DECISIONS.md`: don't build them unless the team asks.

## Stack

- **Expo (React Native)**, demoed on phones with **Expo Go** (`npx expo start`, scan the QR code).
- **Supabase**: database, auth if needed, and **Edge Functions** for anything that uses a secret key. Second free project in Rick's account; partner is invited to the org.
- **Claude API** (Claude Console) is the only AI provider. Claude handles recipe parsing, preference adjustments, scaling servings and matching ingredients to products.
- **Kroger Developer API** (team overrode the MVP's "no live pricing") for real store locations and prices. Kroger-family stores only; other stores are saved but not priced (Kroger owns QFC and Fred Meyer, so it covers Seattle):
  - Locations API: zip code → nearby stores with addresses and coordinates.
  - Products API: search items with prices, using `filter.locationId`.
  - Auth: client-credentials OAuth token, scope `product.compact`.
- **No Google Maps.** The user types a zip code or allows phone location; distance is computed from store coordinates in code.

## Rules

- **Never let the AI invent stores, distances or prices.** Those come from the Kroger API only. Price math happens in code, not in Claude.
- **Secrets never ship in the app.** The Claude API key and Kroger client secret live only in Supabase Edge Function secrets. The app may hold only the Supabase URL and anon key.
- **Never commit keys.** `.env` is gitignored. Keep variable names (no values) in `.env.example`. Share real keys privately between the two of you, never in the repo, Discord channels or screenshots.
- **Split work by area, not by file**, so two Claudes don't edit the same file. Default split: Rick owns screens/UI, partner owns Supabase, Kroger and the data side. Record who owns what in `HANDOFF.md`.
- **Pull before starting. Commit and push every 30–60 minutes** with small commits.
- `main` should always run on the phone. Use a branch for anything risky and merge back often.
- **Every commit gets a change-log entry.** Add a line at the top of "Change log" in `HANDOFF.md` (date/time, who, what changed, anything the other Claude must know) in the same commit. That log is how the two Claudes tell each other what's happening.
- **Before you stop** (tokens running out, break, handing off): update `HANDOFF.md`, commit and push.

## Teaching note: Kroger API

Step-by-step guide: `docs/KROGER.md`. Rick asked to be **taught** the Kroger API while building it, not just have it done for him. He has not created the developer account yet. When Kroger work starts, explain each step as you do it:

1. Register at developer.kroger.com and create an app (client ID + secret, scope `product.compact`).
2. Get an access token with the client-credentials flow.
3. Call the Locations API to find stores near a zip code.
4. Call the Products API to search items and prices at a store (`filter.locationId`).
5. Wrap it in a Supabase Edge Function so the secret stays off the phone, and call that function from the app.

## Run the app

Testing on a phone: `docs/TESTING.md`. First-time setup (Supabase, keys, deploy) is in `HANDOFF.md` → Setup. After that:

```bash
npm install
npx expo start          # scan QR with Expo Go; add --web for the browser
npx tsc --noEmit        # type-check the app
npx tsx scripts/test-pricing.ts   # price-math tests
npx supabase functions deploy recipe   # after changing an Edge Function
```

Layout: app screens in `src/app/` (expo-router; `(tabs)/` is the bottom bar), shared UI in `src/components/`, data calls in `src/lib/api.ts`. Backend in `supabase/` (`migrations/` = schema, `functions/` = Edge Functions, `functions/_shared/pricing.ts` = price math). Expo **SDK 57** (not 58: the App Store Expo Go for iPhone doesn't support 58 yet, so don't upgrade): read `AGENTS.md` before touching Expo APIs; use `npx expo install` to add packages.
