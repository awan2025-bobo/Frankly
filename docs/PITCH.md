# Frankly — 3-minute pitch script

Two speakers: **A** (problem + story) and **B** (demo driver). About 430 spoken words ≈ 3 minutes.
Lines in *[brackets]* are what's on the phone screen. Have the app open on Home, profile set with a peanut allergy,
and one recipe already in the Cookbook.

---

## 0:00 — The problem (A)

College students who love to eat have one big problem. We *want* to cook more at home, but
one, we're almost always on a budget, and two, we don't know where to start with groceries.
We don't know what's cheapest. We don't know what's closest.

When I was a freshman, I wanted to make malatang at home. The only store I knew was H Mart, so
that's where I went, and I probably spent twice what I could have, just because I didn't know
how to shop and cook smartly.

**Frankly fixes that.** It's an AI chef and grocery planner that builds a recipe around your
budget, your kitchen and your body, and then tells you exactly where to buy it for less.

## 0:35 — Onboarding (B)

*[Onboarding: appliance tiles]*
Setup takes under a minute: how many people you cook for, spice and difficulty sliders, favorite
cuisines, diets and allergies, the appliances you actually own, and your zip code. Every question
after your name is skippable.

## 0:50 — Make a recipe (B)

*[Home: "What would you like to cook today?"]*
I just type what I'm craving, say "chicken stir fry", pick servings, a budget, and how many
leftovers I want. Frankly shows the preferences it'll use, and I can pick a style: classic, one of
my cuisines, or "surprise me".

*[Pot animation: "Cooking it up…"]*
Behind this animation, a Claude agent writes a recipe for my profile, then Frankly pulls **live
prices from the Kroger API** at the three closest QFC and Fred Meyer stores.

## 1:20 — The price helper (B)

*[Recipe card: store comparison, budget badge]*
Here's the total at each store, with real distances, and Frankly's pick, weighing cost against
how far I'd drive. If I'm over budget, it suggests cheaper swaps that bring the total down.

*[Tap an ingredient → price sheet]*
Tap any ingredient to see the exact product and price. Already have soy sauce? Tap "I already have
this" and every total updates instantly. And for specialty items Kroger doesn't carry, like
malatang spices, Frankly gives a clearly labeled estimate and tells you to try H Mart. That's the
freshman-me problem, solved. AI never makes up a price: real prices come from Kroger, and estimates
are always labeled.

## 1:55 — Safety (A)

Judges, we tried to break it so you don't have to. *[Type "peanut butter sandwich" with the peanut
allergy]* My profile says peanut allergy, so Frankly won't quietly ignore that, and won't quietly
change my dish either. *[Popup: "Heads up: allergy"]* It makes a sunflower seed butter version and
tells me why. Allergies, diets and appliances are checked twice: by the AI, and again by our own
code before anything reaches the screen. No oven? You'll never see "preheat the oven."

## 2:20 — Cooking + helper (B)

*[Active recipe: tap a step number]*
While cooking, I tap any step to ask Frankly a question: "Is my chicken done if it's a little pink?"
It answers in seconds, with real food-safety temperatures, and stays on topic.

## 2:35 — It learns (A)

*[Not sure? tab → Cookbook]*
Not sure what to make? Frankly suggests dishes based on what I rated highly, what I haven't cooked
in a while, and the staples I already own. After I cook, I rate it, and Frankly adjusts portions,
prices and future picks.

## 2:50 — Close (A)

Frankly is built with Expo, Supabase, Claude and the Kroger API. It plans, shops and remembers,
so students can cook more and spend less.
**Cook smarter, not pricier. Thank you!**
