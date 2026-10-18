# Handoff

Update this before you stop working, then commit and push. Newest status at the top of each section.

**Every commit adds a line to the Change log at the bottom**, in the same commit, so the other Claude knows what happened.

_Last updated: Sat Oct 17, 2026 (evening) by Rick's Claude._

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

- Oct 18 — Rick's Claude — `Button` (ui.tsx): long labels (>26 chars) drop to 14px and wrap centered, button grows (paddingVertical). `Popup` message scrolls past 40% of screen height so buttons stay visible. Fixes the huge "Show me the <dish>" button in the allergy popup.
- Oct 18 — Rick's Claude — "Allergy ignored" report was an account mix-up, not the safety code: the phone's current anonymous account ("frankfarts", made by Profile → Reset demo) had no allergens; Peanuts/Tree nuts were on an older account. Verified live: Peanuts saved → "peanut butter sandwich" gives Sunflower Seed Butter & Jelly + "Heads up: allergy" popup. Added: Preferences asks "Save your changes?" on Back with unsaved edits; Home preview card always shows Diet/Allergens/Appliances (even "None set"). Note: Reset demo = brand-new account, so re-enter allergies after it.
- Oct 18 — Rick's Claude — **Safety failsafe for every AI feature** (team request after "peanut butter sandwich" with a nut allergy was ignored). Recipe agent now decides `conflict_kind` (allergy / diet / equipment / food_safety / budget / not_food) FIRST: safe version + a "Heads up" popup and "Changed for your profile" card (`data.safety_note`), or no recipe + popup with an `alternative` dish button. Code-level net in `supabase/functions/_shared/safety.ts` (word lists for the 9 allergens, typed "Other" allergens, diets incl. halal/kosher/keto, appliances): pre-checks what was typed, checks Claude's recipe, one corrective retry, hard stop if still unsafe; unsafe swaps dropped; "Not sure?" drops unsafe dishes. **Bug fixed:** empty appliances used to mean "assume stovetop + oven"; now it means no-cook only. Helper refuses allergens plainly. Tests: `npx tsx scripts/test-safety.ts` (offline) and `npx tsx scripts/test-agents.ts [filter]` (LIVE, costs a few $ of Claude; reuses one anonymous user stored in gitignored `.agent-test-users.json`).
- Oct 17 — Rick's Claude — **Veggie art swapped** (old set was too close to the DubHacks site): tomato slice -> whole tomato, onion slice -> whole red onion, bell pepper -> bok choy, same flat style. Changed in `Veggies.tsx` (Home floaters + pot drop animation use the same art), `KitchenScene.tsx` (board tomatoes now whole) and the Devpost hero (`docs/devpost/hero.png` re-rendered). Don't bring back sliced tomato/onion or bell pepper.
- Oct 17 — Rick's Claude — Logo PNGs for Devpost from `docs/devpost/logo.html` (same paths as Logo.tsx): `logo.png` (beige), `logo-transparent.png` (real cutouts), `logo-wordmark.png` (logo + "Frankly" in Fraunces Bold, olive #4B5538).
- Oct 17 — Rick's Claude — Devpost hero graphic: `docs/devpost/hero.html` (same clipart as Veggies.tsx) rendered to `docs/devpost/hero.png` (3000x2000) with headless Edge (`msedge --headless=new --force-device-scale-factor=2 --window-size=1500,1000 --screenshot=...`). Not app code.
- Oct 17 — Rick's Claude — Small UI fixes: chopping knife now faces the carrot; `Sheet`/`Popup` (ui.tsx) put the tap-to-close backdrop *behind* the content so the ingredient price sheet scrolls on phones; custom SVG air fryer icon (the icon set only had a fan); "Building your / Frankly…" now on two lines with side padding.
- Oct 17 — Rick's Claude — **Fixed: recipes drifting away from what was typed** ("high protein toast" -> "Miso Tofu Toast"). Cause: favorite cuisines/ratings in the prompt + "lean toward what they rated". Recipe agent now must make the dish asked for with a title close to the words; favorites only matter for "surprise". New **Style** chooser on the Home preview slide: Classic (default) / up to 5 favorite cuisines ("Korean-style") / Surprise me -> sent as `style` (classic | cuisine | surprise). Tested: "High-Protein Egg & Avocado Toast", "High-Protein Cheesy Scrambled Eggs", Korean-style works when picked.
- Oct 17 — Rick's Claude — Bigger UI pass: (1) "I already have this" toggle in each ingredient's location sheet; RecipeView now recomputes store totals/recommendation/estimates client-side (shared pricing.ts) so ticking updates live; saved via `setItemHave()` (staples also go to the internal pantry). (2) Cookbook: tapping a book grows it full-screen and swings the cover open, then navigates. (3) Appliance tiles: `src/components/ApplianceGrid.tsx` (MaterialCommunityIcons, no emojis). (4) Loaders in `src/components/Loaders.tsx`: ChoppingLoader (Not sure?, via BookShelf `loader` prop) and SizzlingPan (Building your Frankly). (5) Recipe loader: pot cycles sizzle -> lid opens + ingredients drop in -> smoke every 3s, with a progress bar easing to 92% over ~15s and finishing on done.
- Oct 17 — Rick's Claude — UI/UX pass: BookShelf heading sits just above the first book (spacer moved above title); book open/close ~40% faster; open-book page scrolls. Helper opens scrolled to the latest message and floats centered (moves above keyboard only while open). Home keeps a "Back to your <recipe>" link for the last unsaved (draft) recipe until it's saved/started/dismissed. Fixed: budget popup re-showing on every visit and showing over other tabs (recipe/[id] popups + RecipeView sheets now gated by useIsFocused; budget popup once per recipe). "Pescatarian" was already spelled right.
- Oct 17 — Rick's Claude — Demo request: Asian specialty-item hints now just say "Try H Mart" (normalized in recipe function + RecipeView, so older saved recipes show it too). Non-Asian specialty hints unchanged.
- Oct 17 — Rick's Claude — **Specialty-item failsafe**: recipe schema adds estimate_usd + where_to_find per ingredient; if the best Kroger store lacks an item it shows "≈ $X Estimate" + "Try an Asian grocery like H Mart", and the total notes the estimated part (data.estimated_total). Matching is stricter: specialty items need their distinctive word and skip the generic retry; ready-made products (cup noodles, sauces, marinades, chips...) are rejected unless the ingredient is one (pricing.ts PREPARED + tests). Live-tested biang biang noodles, tteokbokki, chicken adobo.
- Oct 17 — Rick's Claude — Frankly helper now on EVERY recipe screen (recipe/[id] too: new, saved, cooked), not just Active. Team expected it everywhere.
- Oct 17 — Rick's Claude — **Frankly helper UI**: on the Active recipe, step numbers are tappable (`RecipeView` prop `helperRecipeId`) and open `src/components/StepHelper.tsx`: popup above the step, moves up for the keyboard, quick chips (How do I know it's done? / What can I substitute? / Can I prep this ahead?), short per-step chat (last 3 turns sent), dot on steps you asked about. `askStep()` in api.ts; demo mode has keyword answers. Tested live: step-aware answers ~3-6s, off-topic blocked.
- Oct 17 — Rick's Claude — **Frankly helper backend**: Edge Function `step-help` (deployed) + table `help_questions` (migration pushed). Guardrails: signed-in only, own recipe only, question <=300 chars, last 3 exchanges, 20 questions/user/hour, structured {on_topic, answer} with a fixed off-topic message, short answers, allergens/equipment/food-safety rules. Model: **Sonnet 5.5** (secret HELP_MODEL; tested 16 tricky questions vs Haiku: both safe, Sonnet more precise, same ~2-4s). UI next.
- Oct 17 — Rick's Claude — **Backend is LIVE** (Supabase project ref jdopgeoxvkffzdqlbock; tables pushed; ANTHROPIC + KROGER secrets set; 3 functions deployed). Switched to **Claude Opus 5.5 fast mode** (auto-falls back to standard Opus if fast mode is unavailable), effort low. Speedups: swaps are a separate short list in the schema (less output), Kroger lookups all in parallel with one shared token request. Live test: recipe ~9s (was ~21s: Claude ~6s, Kroger ~1.5s), suggestions ~5-6s. Zip geocoding uses zippopotam.us with OpenStreetMap backup; store names shortened (QFC University Village). Cost ~12-20¢/recipe: raise Console spend limit to ~$30 for judging. Recipe response includes a `timing` field for debugging.
- Oct 17 — Rick's Claude — Migration now grants table access to `authenticated` explicitly, so it works whether or not the new Supabase "Automatically expose new tables" option is on. Project setup choices: Data API ON, automatic RLS ON.
- Oct 17 — Rick's Claude — UI is in a good place (more UI/UX tweaks maybe later). **Next: backend.** Step-by-step guide in `docs/BACKEND_SETUP.md` (Supabase project + anonymous auth, Claude key, Kroger app, db push, secrets, deploy, .env, test). Rick wants to be walked through it and taught the Kroger part.
- Oct 17 — Rick's Claude — **Shared `BookShelf`** (`src/components/BookShelf.tsx`): no more 3D wheel; books just shrink/shorten away from center and grow squarer at center; slots spaced so they never overlap. Used by Not sure? and now by Saved/Cooked books (open book page: Open full recipe / Let's go or Cook it again). **Bottom bar always visible:** recipe/[id], cookbook/[book], finish/[id], preferences moved into `src/app/(tabs)/` (tabs use backBehavior=history; TabBar highlights the parent tab). Those pages reset per id and reload on focus since tab screens stay mounted.
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
