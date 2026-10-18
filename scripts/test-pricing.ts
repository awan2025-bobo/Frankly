// Offline tests for the price math. Run: npx tsx scripts/test-pricing.ts
import assert from "node:assert/strict";
import { parseSize, packagesNeeded, relevant, choose, recommend, milesBetween } from "../supabase/functions/_shared/pricing.ts";

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

assert.deepEqual(parseSize("12 ct"), { qty: 12, unit: "count" });
assert.ok(near(parseSize("16 oz")!.qty, 453.6));
assert.equal(parseSize("16 oz")!.unit, "g");
assert.ok(near(parseSize("1 lb")!.qty, 453.6));
assert.ok(near(parseSize("64 fl oz")!.qty, 1892.7));
assert.equal(parseSize("64 fl oz")!.unit, "ml");
assert.ok(near(parseSize("1/2 gal")!.qty, 1892.7));
assert.ok(near(parseSize("6 ct / 12 fl oz")!.qty, 6 * 354.9));
assert.deepEqual(parseSize("1 dozen"), { qty: 12, unit: "count" });
assert.deepEqual(parseSize("1 each"), { qty: 1, unit: "count" });
assert.equal(parseSize("family size"), null);

const req = (quantity: number, unit: "g" | "ml" | "count", grams = quantity, each = 1) =>
  ({ quantity, unit, grams_estimate: grams, each_estimate: each });

assert.equal(packagesNeeded("16 fl oz", req(470, "ml")), 1); // slack
assert.equal(packagesNeeded("1 lb", req(900, "g")), 2);
assert.equal(packagesNeeded("12 ct", req(3, "count")), 1);
assert.equal(packagesNeeded("1 each", req(300, "g", 300, 2)), 2); // 2 onions
assert.equal(packagesNeeded("32 oz", req(480, "ml", 600)), 1); // cup-measured flour vs weight
assert.equal(packagesNeeded("???", req(1, "count")), 1);

const c = (description: string, size: string, price: number, regularPrice = price) =>
  ({ productId: description, description, brand: "", size, price, regularPrice, aisle: null });

assert.equal(relevant(c("Kroger Garlic Salt", "4 oz", 1), "garlic", ["salt", "powder"]), false);
assert.equal(relevant(c("Fresh Garlic Bulb", "1 each", 1), "garlic", ["salt", "powder"]), true);
assert.equal(relevant(c("Large White Eggs", "12 ct", 3), "eggs", []), true);

const rice = [c("Rice 2 lb", "2 lb", 3.0), c("Rice 10 lb", "10 lb", 9.0)];
assert.equal(choose(rice, req(500, "g"), "none")!.description, "Rice 2 lb"); // cheapest today
assert.equal(choose(rice, req(500, "g"), "lots")!.description, "Rice 10 lb"); // best unit price
assert.equal(choose([c("Sale Milk", "1 gal", 2.5, 3.5)], req(500, "ml"), "some")!.onSale, true);
assert.equal(choose([c("No price", "1 lb", 0)], req(1, "g"), "some"), null);

const stores = [
  { locationId: "a", name: "QFC", distanceMi: 0.8, total: 30, found: 10, missing: ["saffron"] },
  { locationId: "b", name: "Fred Meyer", distanceMi: 2.1, total: 26, found: 10, missing: ["saffron"] },
  { locationId: "c", name: "Kroger", distanceMi: 5, total: 10, found: 4, missing: [] },
];
const r = recommend(stores, 11);
assert.equal(r.best!.name, "Fred Meyer"); // cheapest among stores with the most items
assert.match(r.reason, /\$4\.00 less than QFC/);

assert.ok(near(milesBetween({ lat: 47.6062, lng: -122.3321 }, { lat: 47.6553, lng: -122.3035 }), 3.6));
console.log("pricing tests passed");

// Ready-made products don't match raw ingredients (live bug: gochujang -> cup noodles).
assert.equal(relevant(c("Nissin Cup Noodles Bistro Korean Gochujang Beef Noodles", "1 ct", 1.59), "gochujang", [], "Gochujang gochujang paste"), false);
assert.equal(relevant(c("Mother-in-Law's Gochujang Fermented Chile Paste", "10 oz", 6.99), "gochujang", [], "Gochujang gochujang paste"), true);
assert.equal(relevant(c("Kroger Ramen Noodles", "3 oz", 0.5), "noodle", [], "ramen noodles"), true);
console.log("prepared-food guard tests passed");
assert.equal(relevant(c("Kikkoman Gochujang Spicy Miso Teriyaki Sauce", "10 oz", 6.29), "gochujang", [], "Gochujang gochujang paste"), false);
assert.equal(relevant(c("Kikkoman Soy Sauce", "15 fl oz", 3.29), "soy", [], "Soy sauce soy sauce"), true);
assert.equal(relevant(c("Hunt's Tomato Sauce", "15 oz", 1.0), "tomato", [], "Roma tomatoes roma tomatoes"), false);
console.log("sauce guard tests passed");
