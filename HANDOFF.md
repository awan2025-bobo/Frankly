# Handoff

Update this before you stop working, then commit and push. Newest status at the top of each section.

**Every commit adds a line to the Change log at the bottom**, in the same commit, so the other Claude knows what happened.

_Last updated: Sat Oct 17, 2026, 2:20 PM by Rick's Claude._

## Who owns what

| Area | Owner |
| --- | --- |
| Screens / UI | Rick |
| Supabase, Kroger API, data | Partner (`awan2025-bobo`) |

Change this table if you swap areas.

## Status

**Demo mode:** run `npx expo start` with no `.env` and the app works end to end on a phone with sample data (labeled "Demo mode · sample prices"). Good for testing UI/flow before the backend is set up.

**First demo is built** (one-shot from `docs/MVP.md` + `docs/DECISIONS.md`). It type-checks, bundles, and the screens were checked in a web preview with sample data. **It has NOT run against real Supabase/Claude/Kroger yet**, because the keys don't exist yet. Do the Setup below, then test the full flow on a phone.

## Setup (do once, in this order)

1. **Supabase project** (Rick's account, second free project, West US). Save the DB password.
   - Dashboard → **Authentication → Sign In / Providers → Anonymous sign-ins: ON** (the app has no login screen).
   - Invite partner: Organization → Team.
2. **Link and push the database + functions** from the repo folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... KROGER_CLIENT_ID=... KROGER_CLIENT_SECRET=...
   npx supabase functions deploy kroger-stores recipe suggest
   ```
3. **Claude Console:** ~$10 credit, **set a spend limit**, create the key used above.
4. **Kroger:** follow `docs/KROGER.md` step 1 to get the client ID and secret.
5. **App env:** copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). Share `.env` privately with your partner.
6. **Run:** `npm install`, then `npx expo start`, then scan the QR code with Expo Go. `npx expo start --web` also works in a browser.

## What's built

- **Onboarding** (`src/app/onboarding.tsx`): name → household (+ people count, meals/week) → spice/seasoning/difficulty sliders → cuisines → diet + allergens (+Other) → appliances → stores (+Other, I don't know) → zip/GPS → "Building your Frankly…". Everything after the name is skippable.
- **Tabs** (custom bar, `src/components/TabBar.tsx`): Active · Cookbook · **Home (center)** · Not sure? · Profile.
- **Home** (`src/app/(tabs)/index.tsx`): "What would you like to cook today?" → servings → budget + leftovers → preferences preview (Yes / Change preferences) → "Cooking it up…" → recipe.
- **Recipe** (`src/app/recipe/[id].tsx` + `src/components/RecipeView.tsx`): price + per serving, budget badge, store comparison with reason, "Why Frankly made it this way", cheaper swaps (toggle to apply), ingredients with **location button** (product, packages, aisle, sale price per store), steps. Draft buttons: Let's go / Save for later / I'm not feeling this. Over-budget popup.
- **Active** tab: the one active recipe; I've finished / I'm making something else (→ Saved).
- **I've finished** (`src/app/finish/[id].tsx`): enjoyment, cooking enjoyment, price accuracy (1–10), leftovers less/as expected/more → saved → Cooked Recipes.
- **Cookbook**: two books (Saved, Cooked). Saved: Let's go / Tweak recipe / Delete. Cooked: dates + ratings, Cook it again / Delete.
- **Not sure?** tab: cuisine dropdown (defaults to first favorite cuisine each app launch), cookbook-style list of ideas with "why" tags; tapping one → "Cook this" → Home flow prefilled.
- **Profile**: "What Frankly remembers" stats + staples, Change preferences, Location & stores, Reset demo.
- **Backend** (`supabase/`): schema with RLS (`migrations/`), Edge Functions `kroger-stores`, `recipe` (the agent), `suggest`. Shared code in `functions/_shared/`.
- **Memory/learning:** every Claude request includes profile + last 25 cooked recipes with ratings and leftovers feedback + rejected dishes + remembered staples (`describeMemory()` in `_shared/common.ts`).
- **Internal pantry:** staples bought for a recipe are saved to `pantry_items` on "I've finished"; the next recipe marks them "You already have this" and doesn't charge for them. No pantry screen (team decision).

## Next

- [ ] Do Setup above, then run the full demo flow on a phone: onboarding → recipe → Let's go → I've finished → Cookbook → refresh app → history still there.
- [ ] Partner: README push test (still pending).
- [ ] Watch for Kroger search misses (wrong product picked). Fix by tuning the prompt's search-term rules in `supabase/functions/recipe/index.ts` or `relevant()` in `pricing.ts`.
- [ ] Both: Devpost accounts, register for DubHacks 2026. Make the repo public before submitting.
- [ ] Ideas the team deferred: see "Later" in `docs/DECISIONS.md`. Don't build them unless asked.

## Known bugs / untested

- Not yet run against live Supabase, Claude or Kroger (no keys yet). Expect small fixes on first real run.
- Kroger app environment: `docs/KROGER.md` says to pick Production. If Kroger only offers Certification, the API host differs (`api-ce.kroger.com`) and has no real prices.
- "Tweak recipe" creates a new draft; the original stays in Saved.

## Env vars

App (`.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Supabase secrets: `ANTHROPIC_API_KEY`, `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`.

## Change log

Newest first. Format: `date time — who — what changed (and anything the other Claude must know)`.

- Oct 17 — Rick's Claude — Not sure? wheel v2: fixed slots + snap scrolling; centered book straightens and grows into a taller card with the "why" + Tap to open; first book starts centered under a big header that compresses on scroll; tapping an off-center book scrolls it to center. Book close animation ~2x faster. Home preview slide: overlay pot leaves (mode `away`) and `InlinePot` sits at the end of the content so it scrolls with the page.
- Oct 17 — Rick's Claude — **Animations.** Home: `VeggieStage` (`src/components/Veggies.tsx`) — veggies bob/drift more; on submit the question fades, a pot glides up and the veggies fly in; pot stays docked through servings/budget/preview; on "Yes, cook it up" it moves to center and sizzles (jitter, bubbles, steam) with the agent status line; when the recipe is ready it pops + bursts, then opens the recipe. Carrot leaves fixed. Not sure? tab rebuilt as a stack of cookbook spines: pinned cuisine dropdown, wheel-like 3D tilt on scroll, tap = book flies to center and the cover swings open to details. All plain RN Animated + react-native-svg (Expo Go safe).
- Oct 17 — Rick's Claude — Light orange accent (`C.accent`): Saved Recipes book + profile avatar; Cooked book is olive. Home has floating clipart veggies (`src/components/Veggies.tsx`, SVG, decorative, pointerEvents none, kept to screen edges). Profile "What Frankly remembers" card sits on a flat clipart kitchen (`src/components/KitchenScene.tsx`). Logo v3: layered cabbage leaves rising into a flame, one color.
- Oct 17 — Rick's Claude — **MOYA palette** (team's reference): beige background, olive-matcha primary (`#4B5538`), dirty green/beige bubbles (chips, steppers, toggles, secondary buttons), cream-on-olive text (`C.onPrimary`). Tab bar is solid olive with cream icons + small caps labels. Logo redrawn: one-color flame-shaped cabbage with smiley cutout (`Logo` takes `color`/`cutout` props). Home got "Not sure what to cook?" back under the line.
- Oct 17 — Rick's Claude — **Matcha recolor.** Same layout/fonts as before; only colors changed (`src/lib/theme.ts`): sage background, deep matcha primary, bright matcha "good", warm orange `bad` accent for errors/over-budget. Tokens renamed: tomato→primary, basil→good, mustard→warn, new bad/badSoft. Home is now minimal: tiny cabbage logo top-left (`src/components/Logo.tsx`, SVG via react-native-svg), greeting, "What would you like to cook today?" and the line (arrow appears only after typing; Go key also submits). Team said: NO food photos, keep the original design. Restart Expo with --clear after pulling (new package).
- Oct 17 — Rick's Claude — App opened on the iPhone in Expo Go (demo mode). Added `docs/TESTING.md`: how to run it on a phone each time, demo vs real backend, and fixes for every connection error we hit (SDK mismatch, Expo Go/CLI login mismatch, robot vs personal token, Wi-Fi blocking).
- Oct 17 3:05 PM — Rick's Claude — Added `@expo/ngrok` as a dev dependency so `npx.cmd expo start --tunnel` works on Windows (the global install wasn't found). Use tunnel mode on hackathon Wi-Fi; it needs `npx.cmd expo login` once. If Expo Go is signed into an Expo account, the laptop CLI must be signed into the same one.
- Oct 17 2:45 PM — Rick's Claude — **Downgraded Expo SDK 58 → 57.** iPhone Expo Go from the App Store said "project is incompatible"; SDK 58 (released Sep 29) isn't in App Store Expo Go yet. Don't upgrade back to 58 until Expo Go supports it. TabBar switched to the SDK 57 `navigation.emit/navigate` API. Type-check + iOS bundle pass. On Windows PowerShell use `npx.cmd` (scripts are blocked).
- Oct 17 2:20 PM — Rick's Claude — **Demo mode** (`src/lib/demo.ts`): with no `.env` keys the whole app runs on the phone with sample recipes, clearly labeled SAMPLE prices at 3 demo stores, and data saved on-device (persists across reloads). `src/lib/api.ts` routes every call to demo when `DEMO` is true (`src/lib/supabase.ts`). Adding real keys turns it off automatically. Tested full flow in web preview: onboarding → recipe → over-budget popup → Let's go → I've finished → Cooked → reload persists → 2nd recipe remembers staples and adjusts for leftovers feedback.
- Oct 17 1:50 PM — Rick's Claude — **First demo built.** All screens (onboarding, 5 tabs, recipe, finish, cookbook books, preferences), data API (`src/lib/api.ts`), anonymous session (`src/lib/session.tsx`), design system (`src/components/ui.tsx`, `src/lib/theme.ts`). Added `docs/KROGER.md` (teaching guide), Setup steps above, `.claude/launch.json` for web preview. Verified: `npx tsc --noEmit`, pricing tests, web bundle, screens in browser with sample data. Not yet run against live services.
- Oct 17 1:35 PM — Rick's Claude — Expo SDK 58 (later 57) app scaffolded at repo root (expo-router). Supabase folder: schema migration, Edge Functions `kroger-stores`, `recipe` (the agent: Claude recipe → live Kroger pricing → best store, swaps, budget check), `suggest`. Pricing math in `supabase/functions/_shared/pricing.ts` with tests (`npx tsx scripts/test-pricing.ts`).
- Oct 17 1:25 PM — Rick's Claude — Team answered DECISIONS.md: all approved except #5 (no pantry UI; pantry data internal only). Team overrode MVP: **live Kroger prices** (Kroger-family stores only). Bigger Cook Smarter tweaks deferred to "Later". Starting the one-shot build of the first demo.
- Oct 17 1:05 PM — Rick's Claude — Saved the team's MVP doc as `docs/MVP.md`; added `docs/DECISIONS.md` (15 proposals, all Pending). Updated `CLAUDE.md`: MVP is source of truth, run suggestions past the team. No app code yet.
- Oct 17 2:15 AM — Rick's Claude — Added `docs/IDEA.md` (rough idea, Cook Smarter track, rubric, open questions). Updated `CLAUDE.md` with the track and the change-log rule. Nothing built yet; waiting on the MVP doc.
- Oct 17 ~2:00 AM — Rick's Claude — Added `CLAUDE.md` and `HANDOFF.md`.
- Oct 17 ~1:00 AM — Rick — README push test.
