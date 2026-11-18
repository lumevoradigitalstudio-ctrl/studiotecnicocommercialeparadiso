import { z } from "zod";
import { PantryItem, MealEntryInput } from "@ritmo/core";

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
  name: string; description: string; schema: S; writes: boolean;
  run(ctx: ToolContext, args: z.infer<S>): Promise<unknown>;
}

const empty = z.object({}).strict();
export const TOOLS: ToolDef[] = [
  { name: "get_user_preferences", description: "Preferenze alimentari dell'utente", schema: empty, writes: false, run: (c) => c.data.getPreferences(c.userId) },
  { name: "get_user_schedule", description: "Turni/orari dell'utente", schema: empty, writes: false, run: (c) => c.data.getSchedule(c.userId) },
  { name: "get_pantry_items", description: "Ingredienti in dispensa", schema: empty, writes: false, run: (c) => c.data.getPantry(c.userId) },
  { name: "search_food_database", description: "Cerca alimenti", schema: z.object({ query: z.string().min(2).max(80) }).strict(), writes: false, run: (c, a) => c.data.searchFood(a.query) },
  { name: "save_meal_entry", description: "Salva un pasto (richiede conferma utente)", schema: MealEntryInput.strict(), writes: true, run: (c, a) => c.data.saveMeal(c.userId, a) },
  { name: "update_pantry", description: "Aggiorna dispensa (richiede conferma utente)", schema: z.object({ items: z.array(PantryItem).min(1).max(50) }).strict(), writes: true,
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
