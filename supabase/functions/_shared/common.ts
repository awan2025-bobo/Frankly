// Helpers shared by every Edge Function: CORS, JSON responses, the signed-in
// user's Supabase client, the Claude client, and the "what Frankly remembers" context.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

/** Wraps a handler with CORS + error handling. */
export function serve(handler: (req: Request, db: SupabaseClient, userId: string) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    try {
      const db = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
      );
      const { data } = await db.auth.getUser();
      if (!data.user) return json({ error: "Not signed in" }, 401);
      return await handler(req, db, data.user.id);
    } catch (e) {
      console.error(e);
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  });
}

// Claude Opus 5.5 in fast mode (team asked for faster + smarter for judging; was Sonnet 5.5).
// Fast mode generates up to ~2.5x faster at premium pricing. If the account can't use it (or it's
// rate-limited), we retry the same request on regular Opus 5.5 so the app never breaks.
export const MODEL = "claude-opus-5-5";
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from Supabase secrets
let fastModeAvailable = true;

/** One Claude call that must return JSON matching `schema` (structured outputs). */
/** Which speed the last Claude call actually used ("fast" or "standard"), for timing logs. */
export let lastSpeed = "standard";

export async function claudeJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  const request = (fast: boolean) =>
    anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 12000,
      betas: fast ? ["server-side-fallback-2026-07-01", "fast-mode-2026-02-01"] : ["server-side-fallback-2026-07-01"],
      ...(fast ? { speed: "fast" as const } : {}),
      fallbacks: "default", // if the model declines, the API retries on its recommended fallback
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { effort: opts.effort, format: { type: "json_schema", schema: opts.schema } },
    });

  let res;
  if (fastModeAvailable) {
    try {
      res = await request(true);
    } catch (e) {
      // 400/403: fast mode not available for this account (stop trying). 429: fast-mode capacity, retry standard.
      if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.PermissionDeniedError) fastModeAvailable = false;
      else if (!(e instanceof Anthropic.RateLimitError)) throw e;
      console.warn("fast mode unavailable, using standard Opus:", e instanceof Error ? e.message : e);
      res = await request(false);
    }
  } else {
    res = await request(false);
  }
  lastSpeed = (res.usage as { speed?: string }).speed ?? "standard";
  if (res.stop_reason === "refusal") throw new Error("Claude declined this request. Try a different dish.");
  if (res.stop_reason === "max_tokens") throw new Error("Recipe was too long. Try fewer servings or a simpler dish.");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(text) as T;
}

/** Everything Frankly knows about this user, used to personalize every request. */
export async function loadMemory(db: SupabaseClient) {
  const [profile, cooked, feedback, dismissed, pantry] = await Promise.all([
    db.from("profiles").select("*").maybeSingle(),
    db.from("recipes").select("id,title,cuisine,cooked_at").eq("status", "cooked")
      .order("cooked_at", { ascending: false }).limit(25),
    db.from("feedback").select("recipe_id,enjoyment,cooking_enjoyment,price_accuracy,leftovers,created_at")
      .order("created_at", { ascending: false }).limit(25),
    db.from("recipes").select("title").eq("status", "dismissed").order("created_at", { ascending: false }).limit(10),
    db.from("pantry_items").select("name,added_at").order("added_at", { ascending: false }).limit(80),
  ]);
  if (!profile.data) throw new Error("Finish onboarding first");
  const fb = new Map((feedback.data ?? []).map((f) => [f.recipe_id, f]));
  return {
    profile: profile.data,
    history: (cooked.data ?? []).map((r) => ({ ...r, feedback: fb.get(r.id) ?? null })),
    dismissed: (dismissed.data ?? []).map((r) => r.title as string),
    pantry: (pantry.data ?? []).map((p) => p.name as string),
  };
}

export type Memory = Awaited<ReturnType<typeof loadMemory>>;

const daysAgo = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** Turns the user's memory into prompt text. */
export function describeMemory(m: Memory): string {
  const p = m.profile;
  const lines = [
    `Name: ${p.name || "unknown"}. Cooks for: ${p.cooks_for === "others" ? `${p.household_size} people` : "themself"}.`,
    `Spice ${p.spice}/10, seasoning ${p.seasoning}/10, preferred difficulty ${p.difficulty}/10.`,
    `Cuisines they like: ${p.cuisines.join(", ") || "any"}.`,
    `Diet: ${p.diets.join(", ") || "none"}. ALLERGIES (never include): ${p.allergens.join(", ") || "none"}.`,
    `Appliances they own (only use these, plus a stovetop if listed): ${p.appliances.join(", ") || "unknown, assume a basic stovetop and oven"}.`,
    p.meals_per_week ? `Wants to cook about ${p.meals_per_week} times a week.` : "",
  ];
  if (m.history.length) {
    lines.push("Cooking history (newest first) with their feedback:");
    for (const h of m.history) {
      const f = h.feedback;
      lines.push(`- ${h.title} (${h.cuisine ?? "?"}), cooked ${daysAgo(h.cooked_at)} days ago` +
        (f ? `: enjoyed ${f.enjoyment}/10, enjoyed cooking ${f.cooking_enjoyment}/10, price accuracy ${f.price_accuracy}/10, leftovers ${f.leftovers.replace("_", " ")} than expected` : ""));
    }
  }
  if (m.dismissed.length) lines.push(`Recently rejected ("not feeling this"): ${m.dismissed.join(", ")}.`);
  if (m.pantry.length) lines.push(`Staples they already have at home: ${m.pantry.join(", ")}.`);
  return lines.filter(Boolean).join("\n");
}
