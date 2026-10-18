# Frankly — idea notes (pre-MVP)

**Status: early draft, subject to change.** This is the rough idea, not the MVP spec. A real MVP document is coming. **Don't build from this file alone.** When the MVP doc arrives it replaces this as the source of truth; the team plans to ask for a one-shot first demo from it.

Name: **Frankly** (another name we considered: PriceChef).

## Our idea

### Onboarding (asked once)
- Kitchen appliances you have (so recipes only use equipment the user owns)
- How many times you want to cook (per week)
- Cuisines you like
- Spice preference (a scale)

### Per meal: user enters
- Recipe name
- Number of servings
- Budget
- How many leftover ingredients they're OK with
- Location (zip code)

### What the agent does
1. **Where to buy:** the best store for each ingredient, weighing **lowest cost** against **closest distance**.
2. **How much to buy:** the right quantity for the servings and the user's leftover tolerance.
3. **Pantry memory:** it remembers long-lasting items the user already bought (seasonings, spices, oils, etc.), so it doesn't tell them to buy the same thing for every dish.
4. **Cook history:** it logs each dish and the date it was cooked. When the user runs out of ideas, it suggests dishes they haven't made in a while.

## The ChatGPT version (reference only)

An alternative framing we may borrow from:
- **Problem:** people plan meals without knowing if the ingredients fit their budget or which store has the best value.
- **Killer feature:** "Feed two people for five dinners under $45." It builds a shopping list, estimates cost and prefers ingredients that get reused across meals.
- **MVP:** input budget, number of people and dietary needs → optimized meal plan with estimated total and cheaper substitutions.
- **Its warning:** real-time grocery prices are hard in a weekend, so a small, transparent sample price dataset is enough to show the concept.

How it differs from ours: it plans a whole week around a budget, while ours starts from one recipe the user picks. Both share pantry reuse and budget-first thinking. The Kroger API (see `docs/KROGER.md`) gives us real prices. **A small sample dataset is the fallback** if Kroger access or rate limits block us during the event.

## Track: Cook Smarter

> Make work easier and life more efficient. Build AI agents, automation, productivity tools, planning systems, developer tools, or workflows that reduce friction and help people accomplish more with less effort.

Topics: productivity tools, AI agents, automation, scheduling and planning, logistics, operations, business efficiency, data management.

Our angle: an **AI agent** that **plans** meals and **manages data** (pantry inventory, cook history, prices) to save money and effort.

## Judging rubric

Each criterion is scored 1–8 (1–2 insufficient, 3–4 fair, 5–6 good, 7–8 excellent).

| Criterion | Weight | What gets a 7–8 |
| --- | --- | --- |
| **Functionality** (code works, quality of execution) | **30%** | The project actually works end to end, with robust code. |
| **Track applicability** (relates to Cook Smarter) | **30%** | Goes above and beyond; an exemplary demo of the track's focus. |
| **Design** (UI / aesthetics) | 20% | Very easy to understand and looks very professional. |
| **Creativity** (unique solution, few weaknesses) | 20% | Complex, addresses all the technical and real-world constraints in a unique way. |

What this means for build decisions:
- **A working demo beats more features.** 60% of the score is "does it really work" plus "is it clearly a Cook Smarter agent." Keep the core flow solid before adding extras.
- **Make the agent and data parts visible** in the demo: show the pantry being remembered, the cook history, and why a store was picked (price vs. distance).
- **Polish the UI** (20%). Clean and professional, not flashy.

## Open questions for the MVP doc
- Single recipe per run, a weekly plan, or both?
- How do price and distance get weighed against each other? Does the user pick?
- What does "leftover ingredients" mean exactly: a slider, or a max dollar value of leftovers?
- What's the minimum for the demo: which screens, and which features are cut if time runs out?
- User accounts (Supabase auth), or one local profile for the demo?
