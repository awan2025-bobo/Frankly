# Open decisions for the MVP

The MVP doc (`docs/MVP.md`) says to run every suggestion past the team first. These are Claude's proposals. **Nothing here gets built until it's marked Approved.** When the team answers, change the status and add a change-log line in `HANDOFF.md`.

| # | Question | Proposal | Status |
| --- | --- | --- | --- |
| 1 | Where does recipe knowledge come from? | **Claude itself, no recipe API.** Claude already knows recipes well. It returns structured data (ingredients with amounts, steps, fridge life). None of the free APIs on the team's list help with recipes. | Pending |
| 2 | Who does the price math? | **Our code, not Claude.** Claude matches each ingredient to an item in the sample price dataset; code calculates package counts, cost per store and totals. That keeps prices consistent and explainable. | Pending |
| 3 | What's in the price dataset? | About 120 common ingredients × **3 clearly labeled demo stores**, each with package size and price. Suggested stores: a budget grocer, a regular supermarket, and a bulk club that needs a membership. The bulk club is only recommended if the user picked Costco or another membership store in onboarding. | Pending |
| 4 | Distance / location | No live store data, so each demo store gets a **fixed demo distance**, labeled as demo. **Skip the zip code** for the MVP. | Pending |
| 5 | Where does the pantry live? | A **My Pantry** page in Profile (add or remove items, quantity optional). An optional, skippable onboarding step: "Staples you already have" (salt, oil, etc.). After "I've finished," purchased staples are added to the pantry automatically. | Pending |
| 6 | Leftover tolerance input | Add a third question to the home flow after servings and budget: **"Leftovers? None / Some / Lots."** | Pending |
| 7 | Combined grocery list across recipes ("number of meals") | In Cookbook → Saved, select several recipes and tap **"Shop for these."** You get one combined list with the pantry subtracted, duplicates merged and stores compared. | Pending |
| 8 | Ingredient "location button" | Opens a sheet showing that item's price at each demo store, with the cheapest highlighted. The recipe screen shows the total at each store plus the recommended store, and says why. | Pending |
| 9 | "Unrealistic budget" popup | Code checks the cheapest possible cost against the budget. If the budget is too low, a popup says "The lowest we can do is $X" with buttons to raise the budget or try a cheaper dish. Claude also flags impossible requests, such as an oven dish when the user has no oven. | Pending |
| 10 | "Trains itself" | Frankly doesn't train a model. Every rating, leftover answer and cooked date is saved in Supabase, and a summary is sent with every Claude request, so its suggestions adapt. **In the pitch, say "learns from your feedback," not "trains a model,"** since judges may ask. | Pending |
| 11 | Accounts | **Supabase anonymous sign-in**: no login screen, but data survives app restarts (needed for the "refresh and history persists" demo). Settings gets a "Reset demo" button. | Pending |
| 12 | "How many times do you want to cook" | It's mentioned at the top of the MVP doc but missing from the onboarding flow. Proposal: **optional** question (meals per week). The "What should I make?" tab uses it. | Pending |
| 13 | Who builds the first version | **Rick's Claude one-shots the first demo on `main`.** The partner doesn't edit app code until it's pushed. After that, split by area as in `CLAUDE.md`. | Pending |
| 14 | Claude model | **Claude Sonnet 5.5** (`claude-sonnet-5-5`) for recipes: good quality and fast enough for a live demo. | Pending |
| 15 | Kroger API | **Moved to stretch goal.** The MVP says no live pricing; if there's time after the MVP works, swap one demo store for real Kroger prices (and do the Kroger teaching then). | Pending (team decision in MVP; confirm) |

## Needed before building

- Supabase project URL and anon key (second project in Rick's account).
- Claude Console API key with a spend limit. It goes into Supabase Edge Function secrets, never into the app.
- Expo Go on both phones; Node 20+ on the laptop doing the build.
