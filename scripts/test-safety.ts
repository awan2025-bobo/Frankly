// Offline tests for the allergy / diet / equipment checker. Run: npx tsx scripts/test-safety.ts
import assert from "node:assert/strict";
import { findViolations, kosherMix, missingEquipment } from "../supabase/functions/_shared/safety.ts";

let n = 0;
const bad = (text: string, allergens: string[], diets: string[] = []) => {
  n++;
  assert.ok(findViolations([text], allergens, diets).length > 0, `should flag "${text}" for ${[...allergens, ...diets]}`);
};
const ok = (text: string, allergens: string[], diets: string[] = []) => {
  n++;
  const v = findViolations([text], allergens, diets);
  assert.equal(v.length, 0, `should allow "${text}" for ${[...allergens, ...diets]}, got ${JSON.stringify(v)}`);
};

// Nuts
bad("Creamy peanut butter", ["Peanuts"]);
bad("Peanut Butter & Jelly Sandwich", ["Peanuts"]);
bad("Chicken satay skewers", ["Peanuts"]);
bad("Mixed nuts", ["Peanuts"]);
bad("Sliced almonds", ["Tree nuts"]);
bad("Basil pesto", ["Tree nuts"]);
bad("Nutella", ["Tree nuts"]);
bad("Cashew cream", ["Tree nuts"]);
bad("Almond milk", ["Tree nuts"]);
ok("Coconut milk", ["Peanuts", "Tree nuts"]);
ok("Ground nutmeg", ["Peanuts", "Tree nuts"]);
ok("Butternut squash", ["Peanuts", "Tree nuts"]);
ok("Sunflower seed butter", ["Peanuts", "Tree nuts"]);
ok("Doughnuts", ["Peanuts"]);
ok("Water chestnuts", ["Tree nuts"]);
ok("Pine nuts", ["Peanuts"]);
bad("Peanut sauce", ["nuts"]); // typed under "Other"
bad("Walnuts", ["all nuts"]);

// Milk
bad("Unsalted butter", ["Milk"]);
bad("Shredded mozzarella", ["Milk"]);
bad("Heavy cream", ["Milk"]);
bad("Greek yogurt", ["Milk"]);
bad("Lactose-free milk", ["Milk"]);
ok("Coconut milk", ["Milk"]);
ok("Oat milk", ["Milk"]);
ok("Peanut butter", ["Milk"]);
ok("Cream of tartar", ["Milk"]);
ok("Butter beans", ["Milk"]);
ok("Vegan butter", ["Milk"]);
ok("Nutritional yeast", ["Milk"]);

// Eggs / wheat / soy / fish / shellfish / sesame
bad("Large eggs", ["Eggs"]);
bad("Mayonnaise", ["Eggs"]);
bad("Egg noodles", ["Eggs"]);
ok("Eggplant", ["Eggs"]);
ok("Vegan mayo", ["Eggs"]);
bad("All-purpose flour", ["Wheat"]);
bad("Soy sauce", ["Wheat"]);
bad("Spaghetti", ["Wheat"]);
bad("Panko breadcrumbs", ["Wheat"]);
ok("Rice noodles", ["Wheat"]);
ok("Corn tortillas", ["Wheat"]);
ok("Gluten-free spaghetti", ["Wheat"]);
ok("Tamari", ["Wheat"]);
ok("Buckwheat groats", ["Wheat"]);
ok("Almond flour", ["Wheat"]);
bad("Firm tofu", ["Soy"]);
bad("White miso", ["Soy"]);
bad("Teriyaki sauce", ["Soy"]);
ok("Coconut aminos", ["Soy"]);
bad("Fish sauce", ["Fish"]);
bad("Canned tuna", ["Fish"]);
bad("Worcestershire sauce", ["Fish"]);
bad("Shrimp", ["Shellfish"]);
bad("Oyster sauce", ["Shellfish"]);
ok("Oyster mushrooms", ["Shellfish"]);
ok("Vegetarian oyster sauce", ["Shellfish"]);
bad("Toasted sesame oil", ["Sesame"]);
bad("Hummus", ["Sesame"]);
bad("Tahini", ["Sesame"]);

// Diets
bad("Chicken thighs", [], ["Vegetarian"]);
bad("Beef broth", [], ["Vegetarian"]);
bad("Fish sauce", [], ["Vegetarian"]);
bad("Bacon", [], ["Pescatarian"]);
ok("Salmon fillet", [], ["Pescatarian"]);
ok("Vegetable broth", [], ["Vegan"]);
ok("Cauliflower steaks", [], ["Vegan"]);
ok("Plant-based ground beef", [], ["Vegan"]);
bad("Honey", [], ["Vegan"]);
bad("Parmesan", [], ["Vegan"]);
bad("Eggs", [], ["Vegan"]);
ok("Tofu", [], ["Vegan"]);
bad("Bacon", [], ["Halal"]);
bad("Dry white wine", [], ["Halal"]);
bad("Mirin", [], ["Halal"]);
ok("Turkey bacon", [], ["Halal"]);
ok("Red wine vinegar", [], ["Halal"]);
ok("Ginger", [], ["Halal"]);
bad("Shrimp", [], ["Kosher"]);
bad("Pork shoulder", [], ["Kosher"]);
bad("Long-grain white rice", [], ["Keto"]);
ok("Cauliflower rice", [], ["Keto"]);
ok("Green beans", [], ["Keto"]);
bad("Flour tortillas", [], ["Gluten-free"]);
bad("Whole milk", [], ["Dairy-free"]);
ok("Anything goes", [], ["Low-carb", "High-protein"]);
n++; assert.ok(kosherMix(["Ground beef", "Shredded cheddar"], ["Kosher"]));
n++; assert.equal(kosherMix(["Ground beef", "Onion"], ["Kosher"]), null);
// Labeled free-from / left out (seen in live tests)
ok("Classic Dairy-Free, Gluten-Free Grilled Cheese", ["Milk", "Wheat"]);
ok("Egg-free gluten-free sandwich bread", ["Eggs", "Wheat"]);
ok("Classic Nut-Free Basil Pesto Pasta", ["Tree nuts"]);
ok("Classic Vegan Scrambled 'Eggs' (Tofu Scramble)", [], ["Vegan"]);
ok("Skip cheese, add extra pickles and onion", [], ["Vegan"]);
ok("Classic Fresh Salsa (Pico-Style, No Cilantro)", ["cilantro"]);
ok("Non-alcoholic red wine", [], ["Halal"]);
ok("Keto Chicken Fried Rice (Cauliflower Rice)", [], ["Keto"]);
ok("Spaghetti squash", [], ["Keto", "Gluten-free"]);
ok("Marinara sauce (no sugar added)", [], ["Keto"]);
bad("No-Cook Peanut Noodles", ["Peanuts"]);
bad("Peanut sauce (no sugar)", ["Peanuts"]);
// Custom allergen words
bad("Fresh strawberries", ["Strawberries"]);
ok("Blueberries", ["Strawberries"]);
bad("Chopped cilantro", ["cilantro"]);

// Equipment
const eq = (steps: string[], own: string[]) => missingEquipment(steps, own);
n++; assert.deepEqual(eq(["Preheat the oven to 400°F.", "Bake 20 minutes."], ["Stovetop"]), ["an oven"]);
n++; assert.deepEqual(eq(["Preheat the oven to 400°F."], ["Toaster oven"]), []);
n++; assert.deepEqual(eq(["Heat oil in a skillet over medium heat."], []), ["a stovetop"]);
n++; assert.deepEqual(eq(["Bring a pot of water to a boil."], ["Microwave"]), ["a stovetop"]);
n++; assert.deepEqual(eq(["Spread the peanut-free butter on bread.", "Slice in half."], []), []);
n++; assert.deepEqual(eq(["Whisk the baking soda into the flour."], []), []);
n++; assert.deepEqual(eq(["Blend until smooth."], ["Stovetop"]), ["a blender"]);
n++; assert.deepEqual(eq(["Microwave on high for 2 minutes."], ["Stovetop"]), ["a microwave"]);
n++; assert.deepEqual(eq(["Air-fry at 380°F for 12 minutes."], ["Air fryer"]), []);

console.log(`safety: all ${n} checks passed`);
