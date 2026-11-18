// Edge Function «ritmo-chat». Segreti richiesti (impostati dal proprietario, MAI nel repo):
//   USDA_API_KEY (facoltativa, gratuita: senza, si usa solo Open Food Facts),
//   ANTHROPIC_API_KEY, ANTHROPIC_MODEL, PRICE_IN_EUR_PER_MTOK, PRICE_OUT_EUR_PER_MTOK, AI_GLOBAL_MONTHLY_BUDGET_EUR (facoltativo)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sono forniti dalla piattaforma.
import { createClient } from "npm:@supabase/supabase-js@2";
import { searchFoods, TtlCache } from "../../../packages/nutrition/src/index.ts";
import { handleChat, AnthropicProvider, resolvePlan, type QuotaGate, type DataAccess } from "../../../packages/ai/src/index.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const foodCache = new TtlCache<Awaited<ReturnType<typeof searchFoods>>>(); // cache per istanza, 6 h
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function makeProvider() {
  const key = env("ANTHROPIC_API_KEY"), model = env("ANTHROPIC_MODEL"), pin = Number(env("PRICE_IN_EUR_PER_MTOK")), pout = Number(env("PRICE_OUT_EUR_PER_MTOK"));
  if (!key || !model || !(pin >= 0) || !(pout >= 0) || env("PRICE_IN_EUR_PER_MTOK") === "" || env("PRICE_OUT_EUR_PER_MTOK") === "") return null; // senza prezzi non si può controllare il costo
  return new AnthropicProvider({ apiKey: key, model, pricePerMTokEur: { input: pin, output: pout } });
}

class DbQuota implements QuotaGate {
  private ledgerId: string | null = null;
  async tryConsume(user: string) {
    const budget = env("AI_GLOBAL_MONTHLY_BUDGET_EUR");
    const { data, error } = await admin.rpc("consume_ai_quota", { p_user: user, p_global_month_budget_eur: budget ? Number(budget) : null });
    if (error || !data?.[0]) return { ok: false as const, reason: "budget" as const }; // fail-closed
    const row = data[0] as { decision: string; ledger_id: string | null };
    if (row.decision === "ok") { this.ledgerId = row.ledger_id; return { ok: true as const }; }
    return { ok: false as const, reason: row.decision as "daily" | "monthly" | "concurrency" | "budget" };
  }
  async release(_u: string, cost: number, usage?: { inputTokens: number; outputTokens: number }, ok = false) {
    if (!this.ledgerId) return;
    await admin.rpc("finish_ai_request", { p_id: this.ledgerId, p_in: usage?.inputTokens ?? 0, p_out: usage?.outputTokens ?? 0, p_cost: cost, p_ok: ok });
  }
}

Deno.serve((req: Request) => handleChat(req, {
  authenticate: async (r) => {
    const token = r.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { userId: data.user.id };
  },
  makeQuota: () => new DbQuota(),
  provider: makeProvider(),
  getPlan: async (uid) => { const { data } = await admin.from("subscription_entitlements").select("active,expires_at").eq("user_id", uid).maybeSingle(); return resolvePlan(data ? { active: data.active, expiresAt: data.expires_at } : null); },
  makeData: (r, uid): DataAccess => {
    // Client col JWT dell'utente: le query passano dalla RLS.
    const c = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: r.headers.get("authorization") ?? "" } }, auth: { persistSession: false } });
    return {
      getPreferences: async () => (await c.from("user_preferences").select("goal,diet,excluded_foods,cooking_minutes").eq("user_id", uid).maybeSingle()).data ?? {},
      getSchedule: async () => (await c.from("work_schedules").select("weekday,start_time,end_time").eq("user_id", uid)).data ?? [],
      getPantry: async () => (await c.from("pantry_items").select("name").eq("user_id", uid).limit(100)).data ?? [],
      searchFood: async (q) => {
        try {
          const r = await searchFoods(q, { usdaApiKey: env("USDA_API_KEY") || undefined, cache: foodCache });
          return { foods: r.foods.slice(0, 6).map(f => ({ name: f.name, brand: f.brand, per100g: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, source: f.source })), attributions: r.attributions, partial: r.partial, note: "valori per 100 g, stime da database esterni" };
        } catch { return { foods: [], attributions: [], partial: true, note: "ricerca non disponibile" }; }
      },
      saveMeal: async () => { throw new Error("scrittura via chat non consentita: usare la conferma lato app"); },
      upsertPantry: async () => { throw new Error("scrittura via chat non consentita: usare la conferma lato app"); },
    };
  },
}));
