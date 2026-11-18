import { z } from "zod";

export const PlanId = z.enum(["free", "plus"]);
export type PlanId = z.infer<typeof PlanId>;

/** Limiti dichiarati per piano. Fonte unica: lato server li legge la funzione SQL `consume_ai_quota`. */
export const PLAN_LIMITS: Record<PlanId, { aiMessagesPerDay: number; aiMessagesPerMonth: number; maxConcurrent: number }> = {
  free: { aiMessagesPerDay: 5, aiMessagesPerMonth: 60, maxConcurrent: 1 },
  plus: { aiMessagesPerDay: 40, aiMessagesPerMonth: 500, maxConcurrent: 2 },
};

export const MealType = z.enum(["colazione", "pranzo", "cena", "spuntino"]);
export type MealType = z.infer<typeof MealType>;

export const UserPreferences = z.object({
  goal: z.enum(["mangiare_meglio", "organizzare_pasti", "mantenimento", "risparmiare_tempo"]),
  diet: z.array(z.enum(["onnivoro", "vegetariano", "vegano", "pescetariano", "senza_glutine", "senza_lattosio"])).default([]),
  excludedFoods: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  cookingMinutes: z.number().int().min(0).max(240).default(30),
  weeklyBudgetEur: z.number().min(0).max(1000).nullable().default(null),
  notificationsEnabled: z.boolean().default(false),
});
export type UserPreferences = z.infer<typeof UserPreferences>;

export const WorkShift = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type WorkShift = z.infer<typeof WorkShift>;

export const PantryItem = z.object({
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(100000).optional(),
  unit: z.enum(["g", "kg", "ml", "l", "pz"]).optional(),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type PantryItem = z.infer<typeof PantryItem>;

export const MealEntryInput = z.object({
  mealType: MealType,
  eatenAt: z.string().datetime(),
  description: z.string().trim().min(1).max(200),
  kcal: z.number().min(0).max(5000).nullable().default(null),
  isEstimate: z.boolean().default(true),
});
export type MealEntryInput = z.infer<typeof MealEntryInput>;

export const ConsentPurpose = z.enum(["terms", "privacy", "health_data_processing", "ai_memory", "marketing"]);
export type ConsentPurpose = z.infer<typeof ConsentPurpose>;

/** Entitlement derivato SOLO dal server (webhook RevenueCat → tabella). Mai dal client. */
export function resolvePlan(ent: { active: boolean; expiresAt: string | null } | null, now = new Date()): PlanId {
  if (!ent || !ent.active) return "free";
  if (ent.expiresAt && new Date(ent.expiresAt) <= now) return "free";
  return "plus";
}
