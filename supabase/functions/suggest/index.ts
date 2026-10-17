// POST { cuisine }
// The "What should I make?" Agent: a cookbook-style list of dishes picked from the
// user's preferences, ratings, what they haven't cooked in a while, and staples on hand.

import { claudeJSON, describeMemory, json, loadMemory, serve } from "../_shared/common.ts";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dishes"],
  properties: {
    dishes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "why", "total_minutes", "difficulty", "tag"],
        properties: {
          name: { type: "string" },
          description: { type: "string", description: "One appetizing sentence, like a cookbook blurb" },
          why: { type: "string", description: "Short reason it's suggested for THIS user (history, ratings, staples, time)" },
          total_minutes: { type: "integer" },
          difficulty: { type: "integer", description: "1-10" },
          tag: { type: "string", enum: ["new", "rotation", "uses_staples", "favorite_style"] },
        },
      },
    },
  },
};

serve(async (req, db) => {
  const { cuisine } = await req.json();
  const memory = await loadMemory(db);
  const out = await claudeJSON<{ dishes: unknown[] }>({
    system: `You are Frankly's "What should I make?" agent. Suggest 8 home-cookable dishes like a curated cookbook page.
Respect allergies, diets and appliances strictly. Mix: a few they'd love based on high ratings ("favorite_style"),
1-2 they cooked and liked but not in the last 2+ weeks ("rotation", say how long ago), some that lean on staples
they already have ("uses_staples"), and fresh ideas ("new"). Avoid dishes cooked in the last 7 days and rejected ones.
Favor budget-friendly ingredients. Never mention prices.`,
    effort: "low",
    maxTokens: 4000,
    prompt: `What Frankly remembers about this user:\n${describeMemory(memory)}\n\nCuisine to browse: ${String(cuisine || "any").slice(0, 40)}.`,
    schema: SCHEMA,
  });
  return json(out);
});
