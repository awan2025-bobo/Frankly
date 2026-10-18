# Backend setup (Supabase + Claude + Kroger)

The backend code is already written: schema in `supabase/migrations/`, Edge Functions `kroger-stores`, `recipe` and `suggest` in `supabase/functions/`. This guide just turns it on. Budget about 30–45 minutes. **Never paste keys into chat, Discord or the repo.** Type them only where this guide says.

## What you need

| Thing | Have it? | Cost |
| --- | --- | --- |
| Supabase account | ✅ | Free (2nd free project) |
| Claude Console account | ✅ | ~$10 credit, set a spend limit |
| Kroger Developer account | ❌ make one (step 3) | Free |
| OpenStreetMap geocoding (zip → coordinates) | Nothing to do | Free, no key |

That's everything: no Google Maps and no other APIs.

## 1. Supabase project (≈5 min)

1. supabase.com → **New project**. Name: `frankly`. Region: **West US (Oregon)**. Generate a DB password and **save it** (you need it in step 4).
2. Wait for it to finish provisioning.
3. **Authentication → Sign In / Providers → turn ON "Allow anonymous sign-ins"** → Save. (The app has no login screen. Each phone gets an anonymous user.)
4. **Project Settings → API** (may be under "Data API" / "API Keys"). Copy:
   - **Project URL**, like `https://abcdxyz.supabase.co`. The part before `.supabase.co` is your **project ref**.
   - **anon / publishable key**. This one is safe to put in the app.
5. Optional: Organization → Team → invite your partner.

## 2. Claude API key (≈3 min)

1. console.anthropic.com → **Billing**: add ~$10.
2. **Limits**: set a monthly spend limit (e.g. $15) so a bug can't run up a bill.
3. **API Keys → Create key**, name `frankly`. Copy it now (it's shown once).
   Frankly uses **Claude Sonnet 5.5**. One recipe costs roughly a cent or two.

## 3. Kroger Developer API (≈5 min)

Follow `docs/KROGER.md` step 1: developer.kroger.com → sign up → **Create App** (Production, scope **Product**) → copy **Client ID** and **Client Secret**. That file also explains how the Kroger code works.

## 4. Push the backend from the laptop (≈10 min)

Open a terminal in the `Frankly` folder (on Windows use `npx.cmd`):

```bash
npx.cmd supabase login
```
(opens a browser and logs the CLI into your Supabase account)

```bash
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
```
(asks for the DB password from step 1)

```bash
npx.cmd supabase db push
```
(creates the tables: profiles, recipes, feedback, pantry_items, with row-level security)

Set the three secrets (**type your real values yourself**, they stay on Supabase's servers, never in the app):
```bash
npx.cmd supabase secrets set ANTHROPIC_API_KEY=sk-ant-... KROGER_CLIENT_ID=... KROGER_CLIENT_SECRET=...
```

Deploy the three functions:
```bash
npx.cmd supabase functions deploy kroger-stores recipe suggest
```

## 5. Point the app at it (≈2 min)

Create a file named `.env` in the `Frankly` folder (it's gitignored) with:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
Share this `.env` with your partner privately (same values work on both laptops).

## 6. Test

```bash
npx.cmd expo start --lan --clear
```
- The **"Demo mode" badge disappears**. The app now uses the real backend.
- You'll see **onboarding again** (new anonymous user). Enter a real zip (e.g. 98105) → **real QFC / Fred Meyer stores** should appear.
- Cook something: the pot sizzles longer (~15–30 s, Claude + live Kroger prices), then a real recipe with real prices.
- Check data: Supabase → **Table Editor** shows your profile, recipes and feedback rows.

## If something breaks

| Symptom | Where to look / fix |
| --- | --- |
| "Frankly can't reach its kitchen" on launch | `.env` values wrong, or anonymous sign-ins not enabled (step 1.3). Restart Expo after editing `.env`. |
| Error when finding stores or cooking | Supabase → **Edge Functions → (function) → Logs**. Missing secret = step 4 secrets line. |
| "Kroger token failed (401)" | Wrong Kroger ID/secret, or the app was made in Certification instead of Production. |
| Recipe works but items "not found" | Kroger search mismatch. Tune search-term rules in `supabase/functions/recipe/index.ts`. |
| Changed a function | Re-run `npx.cmd supabase functions deploy recipe` (or whichever). |
