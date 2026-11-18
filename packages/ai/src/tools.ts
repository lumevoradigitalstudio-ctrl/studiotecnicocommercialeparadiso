import { z } from "zod";
import { PantryItem, MealEntryInput, RECIPES, matchRecipes, shoppingList } from "@ritmo/core";

/** Accesso dati astratto: l'implementazione reale usa il client Supabase con il JWT dell'utente (RLS). */
export interface DataAccess {
  getPreferences(userId: string): Promise<unknown>;
  getSchedule(userId: string): Promise<unknown>;
  getPantry(userId: string): Promise<{ name: string }[]>;
  searchFood(query: string): Promise<unknown[]>;
  saveMeal(userId: string, meal: z.infer<typeof MealEntryInput>): Promise<{ id: string }>;
  upsertPantry(userId: string, items: z.infer<typeof PantryItem>[]): Promise<void>;
}
/** L'identità arriva dal contesto autenticato, MAI dagli argomenti scelti dal modello. */
export interface ToolContext { userId: string; data: DataAccess; confirmed: boolean }

export interface ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string; description: string; schema: S; writes: boolean; jsonSchema: Record<string, unknown>;
  run(ctx: ToolContext, args: z.infer<S>): Promise<unknown>;
}

const empty = z.object({}).strict();
const PrefsLoose = z.object({ excludedFoods: z.array(z.string()).optional(), excluded_foods: z.array(z.string()).optional(), diet: z.array(z.string()).optional() }).passthrough();
async function userFilters(c: ToolContext) {
  const p = PrefsLoose.safeParse(await c.data.getPreferences(c.userId));
  const v = p.success ? p.data : {};
  return { excluded: v.excludedFoods ?? v.excluded_foods ?? [], vegetarian: (v.diet ?? []).some(d => d === "vegetariano" || d === "vegano") };
}

export const TOOLS: ToolDef[] = [
  { name: "get_user_preferences", description: "Preferenze alimentari dell'utente", schema: empty, writes: false, jsonSchema: { type: "object", properties: {}, additionalProperties: false }, run: (c) => c.data.getPreferences(c.userId) },
  { name: "get_user_schedule", description: "Turni/orari dell'utente", schema: empty, writes: false, jsonSchema: { type: "object", properties: {}, additionalProperties: false }, run: (c) => c.data.getSchedule(c.userId) },
  { name: "get_pantry_items", description: "Ingredienti in dispensa", schema: empty, writes: false, jsonSchema: { type: "object", properties: {}, additionalProperties: false }, run: (c) => c.data.getPantry(c.userId) },
  { name: "search_food_database", description: "Cerca alimenti", schema: z.object({ query: z.string().min(2).max(80) }).strict(), writes: false, jsonSchema: { type: "object", properties: { query: { type: "string", minLength: 2, maxLength: 80 } }, required: ["query"], additionalProperties: false }, run: (c, a) => c.data.searchFood(a.query) },
  { name: "search_recipes", description: "Ricette italiane compatibili con la dispensa e le preferenze (esclusioni, vegetariano). Nessun dato nutrizionale: non disponibile.", writes: false,
    schema: z.object({ maxMinutes: z.number().int().min(5).max(240).optional() }).strict(),
    jsonSchema: { type: "object", properties: { maxMinutes: { type: "integer", minimum: 5, maximum: 240 } }, additionalProperties: false },
    run: async (c, a) => {
      const [pantry, f] = await Promise.all([c.data.getPantry(c.userId), userFilters(c)]);
      return matchRecipes(pantry.map(p => p.name), { ...f, maxMinutes: a.maxMinutes, limit: 3 })
        .map(m => ({ id: m.recipe.id, title: m.recipe.title, minutes: m.recipe.minutes, servings: m.recipe.servings, have: m.have, missing: m.missing, steps: m.recipe.steps, alternatives: m.recipe.alternatives ?? [] }));
    } },
  { name: "create_shopping_list", description: "Lista della spesa per una ricetta: solo ciò che manca in dispensa, per le porzioni richieste", writes: false,
    schema: z.object({ recipeId: z.string().max(60), servings: z.number().int().min(1).max(20) }).strict(),
    jsonSchema: { type: "object", properties: { recipeId: { type: "string" }, servings: { type: "integer", minimum: 1, maximum: 20 } }, required: ["recipeId", "servings"], additionalProperties: false },
    run: async (c, a) => {
      const recipe = RECIPES.find(r => r.id === a.recipeId); if (!recipe) return { error: "ricetta_non_trovata" };
      return { items: shoppingList([{ recipe, servings: a.servings }], (await c.data.getPantry(c.userId)).map(p => p.name)) };
    } },
  { name: "save_meal_entry", description: "Salva un pasto (richiede conferma utente)", schema: MealEntryInput.strict(), writes: true, jsonSchema: { type: "object", properties: { mealType: { type: "string", enum: ["colazione","pranzo","cena","spuntino"] }, eatenAt: { type: "string", description: "ISO 8601" }, description: { type: "string", maxLength: 200 }, kcal: { type: ["number","null"] }, isEstimate: { type: "boolean" } }, required: ["mealType","eatenAt","description"], additionalProperties: false }, run: (c, a) => c.data.saveMeal(c.userId, a) },
  { name: "update_pantry", description: "Aggiorna dispensa (richiede conferma utente)", schema: z.object({ items: z.array(PantryItem).min(1).max(50) }).strict(), writes: true, jsonSchema: { type: "object", properties: { items: { type: "array", maxItems: 50, items: { type: "object", properties: { name: { type: "string" }, quantity: { type: "number" }, unit: { type: "string", enum: ["g","kg","ml","l","pz"] }, expiresOn: { type: "string" } }, required: ["name"] } } }, required: ["items"], additionalProperties: false },
    run: async (c, a) => { await c.data.upsertPantry(c.userId, a.items); return { updated: a.items.length }; } },
];

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string; needsConfirmation?: boolean };

export async function executeTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<ToolResult> {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) return { ok: false, error: "unknown_tool" };
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) return { ok: false, error: "invalid_arguments" }; // include userId extra: .strict() lo rifiuta
  if (tool.writes && !ctx.confirmed) return { ok: false, error: "confirmation_required", needsConfirmation: true };
  try { return { ok: true, data: await tool.run(ctx, parsed.data) }; }
  catch { return { ok: false, error: "tool_failed" }; }
}
