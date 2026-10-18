<p align="center">
  <img src="docs/devpost/logo-wordmark.png" alt="Frankly" width="420">
</p>

<p align="center"><b>Cook smarter, not pricier.</b><br>
An AI chef and grocery planner for college students and anyone cooking on a budget.<br>
DubHacks 2026 · Cook Smarter track</p>

---

## The problem

Students want to cook at home more, but they're on a tight budget and don't know where to start with groceries:
what's cheapest, what's closest, and what they actually need. It's easy to end up at the one store you know and
pay twice what you should.

## What Frankly does

- **Quick onboarding.** Household size, spice and difficulty sliders, favorite cuisines, diets, allergies, the
  appliances you own, and your zip code. Everything after your name is optional.
- **A recipe built around you.** Type what you're craving, pick servings, a budget and how many leftovers you want,
  and choose a style (classic, one of your cuisines, or "surprise me").
- **Live grocery prices.** Frankly prices every ingredient at the three nearest Kroger-family stores (QFC, Fred Meyer)
  using the Kroger API, compares totals, and recommends a store by weighing cost against distance.
- **Price helper.** Tap any ingredient to see the exact product and price, mark "I already have this" and watch the
  totals update, and get cheaper swaps when you're over budget. Specialty items Kroger doesn't carry get a clearly
  labeled estimate and a hint about where to find them.
- **Safety first.** Allergies, diets and appliances are enforced twice: in the AI instructions and again in code
  before anything is shown. If a request clashes with your profile (a peanut butter sandwich with a peanut allergy,
  an oven dish with no oven), Frankly tells you what it changed or suggests something you can make.
- **Step helper.** While cooking, tap any step to ask a question ("is my chicken done?") and get a short, food-safe
  answer that stays on topic.
- **"Not sure?" suggestions.** A cookbook-style page of ideas based on your ratings, what you haven't cooked in a
  while, and the staples you already have.
- **It learns.** Rate a dish after cooking; Frankly adjusts portions, prices and future suggestions.

**Prices are never made up:** real prices come from Kroger, the price math is done in code, and estimates are
always labeled as estimates.

## Tech

| Part | What we used |
| --- | --- |
| App | Expo (React Native), expo-router, react-native-svg animations |
| Backend | Supabase: Postgres with row-level security, anonymous auth, Edge Functions |
| AI | Claude API: Opus 5.5 for recipes and suggestions, Sonnet 5.5 for the step helper, structured JSON outputs |
| Grocery data | Kroger Developer API (Locations + Products) |

All secret keys live in Supabase Edge Function secrets; the app only holds the public Supabase URL and anon key.

```
src/app/          screens (expo-router; tabs, recipe, onboarding, preferences)
src/components/   shared UI, recipe view, animations
src/lib/          data calls, session, theme, demo mode
supabase/functions/
  recipe/         recipe agent: profile + request -> recipe -> live Kroger prices -> best store, swaps, budget check
  suggest/        "Not sure?" suggestions
  step-help/      step helper with guardrails
  kroger-stores/  zip code -> nearest stores with distances
  _shared/        Claude client, Kroger client, price math, safety checker
supabase/migrations/  database schema
```

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. Without a `.env` file the app runs in **demo mode** with sample recipes and prices.
To connect the real backend, copy `.env.example` to `.env` and follow [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md).
More: [phone testing](docs/TESTING.md) · [how we use the Kroger API](docs/KROGER.md).

### Tests

```bash
npx tsc --noEmit                   # type-check
npx tsx scripts/test-pricing.ts    # price math
npx tsx scripts/test-safety.ts     # allergy / diet / appliance checker
npx tsx scripts/test-agents.ts     # live end-to-end checks against the deployed backend (uses API credits)
```

## License

MIT
