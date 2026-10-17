# Frankly — DubHacks 2026

Read this first, then `HANDOFF.md` for current status and the change log, then `docs/IDEA.md` for the product idea.

Two people (Rick and his partner, GitHub `awan2025-bobo`) build this together, each with their own Claude account. **Claude memory is not shared between accounts**, so this file and `HANDOFF.md` are the only shared context. Keep them current.

## The event

- DubHacks 2026, University of Washington, **Sat Oct 17 – Sun Oct 18, 2026**.
- Theme: **"Let's Get Cookin'!"**
- **Submissions due Sun Oct 18, 10:30 AM** on Devpost. Make the repo public before submitting.
- All app code must be written during the event (past years' rule).
- **Track chosen: Cook Smarter** (AI agents, planning, data management). Rubric: Functionality 30%, Track applicability 30%, Design 20%, Creativity 20%. Full rubric in `docs/IDEA.md`.

## The app

A budget chef assistant for college students and budget eaters. Onboarding captures appliances, how often they cook, cuisines and spice level. Per meal, the user enters a recipe, servings, budget, leftover tolerance and zip code. The agent picks where to buy each ingredient (cost vs. distance) and how much, remembers long-lasting pantry items so it doesn't re-buy them, and logs cook history to suggest dishes not made in a while.

**This is still a rough idea (`docs/IDEA.md`).** An MVP document is coming; once it lands it becomes the source of truth. **Don't start building the app until the team sends it.** They plan to ask for a one-shot first demo from it.

## Stack

- **Expo (React Native)**, demoed on phones with **Expo Go** (`npx expo start`, scan the QR code).
- **Supabase**: database, auth if needed, and **Edge Functions** for anything that uses a secret key. Second free project in Rick's account; partner is invited to the org.
- **Claude API** (Claude Console) is the only AI provider. Claude handles recipe parsing, preference adjustments, scaling servings and matching ingredients to products.
- **Kroger Developer API** for real store locations and prices (Kroger owns QFC and Fred Meyer, so it covers Seattle):
  - Locations API: zip code → nearby stores with addresses and coordinates.
  - Products API: search items with prices, using `filter.locationId`.
  - Auth: client-credentials OAuth token, scope `product.compact`.
- **No Google Maps.** The user types a zip code; distance is computed from store coordinates in code.

## Rules

- **Never let the AI invent stores, addresses, distances or prices.** Those come from the Kroger API only.
- **Secrets never ship in the app.** The Claude API key and Kroger client secret live only in Supabase Edge Function secrets. The app may hold only the Supabase URL and anon key.
- **Never commit keys.** `.env` is gitignored. Keep variable names (no values) in `.env.example`. Share real keys privately between the two of you, never in the repo, Discord channels or screenshots.
- **Split work by area, not by file**, so two Claudes don't edit the same file. Default split: Rick owns screens/UI, partner owns Supabase, Kroger and the data side. Record who owns what in `HANDOFF.md`.
- **Pull before starting. Commit and push every 30–60 minutes** with small commits.
- `main` should always run on the phone. Use a branch for anything risky and merge back often.
- **Every commit gets a change-log entry.** Add a line at the top of "Change log" in `HANDOFF.md` (date/time, who, what changed, anything the other Claude must know) in the same commit. That log is how the two Claudes tell each other what's happening.
- **Before you stop** (tokens running out, break, handing off): update `HANDOFF.md`, commit and push.

## Teaching note: Kroger API

Rick asked to be **taught** the Kroger API while building it, not just have it done for him. He has not created the developer account yet. When Kroger work starts, explain each step as you do it:

1. Register at developer.kroger.com and create an app (client ID + secret, scope `product.compact`).
2. Get an access token with the client-credentials flow.
3. Call the Locations API to find stores near a zip code.
4. Call the Products API to search items and prices at a store (`filter.locationId`).
5. Wrap it in a Supabase Edge Function so the secret stays off the phone, and call that function from the app.

## Run the app

Not set up yet; the Expo project gets created once the hackathon starts. Fill this in when it exists (install command, `.env` setup, start command).
