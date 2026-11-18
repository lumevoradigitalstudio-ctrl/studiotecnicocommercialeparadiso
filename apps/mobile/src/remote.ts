import type { z } from "zod";
import type { UserPreferences, PantryItem } from "@ritmo/core";
import { supabase } from "./supabase";
import type { MealRow } from "./store";

type Prefs = z.infer<typeof UserPreferences>; type Pantry = z.infer<typeof PantryItem> & { id?: string };
const db = () => { if (!supabase) throw new Error("backend non configurato"); return supabase; };
const check = <T,>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };

/** Accesso dati autenticato col JWT dell'utente: la sicurezza è garantita dalla RLS lato database. */
export async function loadAll(userId: string) {
  const c = db();
  const [prof, pref, pantry, meals] = await Promise.all([
    c.from("profiles").select("onboarding_completed").eq("id", userId).maybeSingle(),
    c.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    c.from("pantry_items").select("id,name,quantity,unit,expires_on").order("created_at"),
    c.from("meal_entries").select("id,meal_type,eaten_at,description,kcal,is_estimate").order("eaten_at", { ascending: false }).limit(200),
  ]);
  const p = check(pref), pr = check(prof);
  return {
    onboarded: !!pr?.onboarding_completed,
    prefs: p ? { goal: p.goal, diet: p.diet ?? [], excludedFoods: p.excluded_foods ?? [], cookingMinutes: p.cooking_minutes ?? 30, weeklyBudgetEur: p.weekly_budget_eur, notificationsEnabled: false } as Prefs : null,
    pantry: (check(pantry) ?? []).map((r: any): Pantry => ({ id: r.id, name: r.name, quantity: r.quantity ?? undefined, unit: r.unit ?? undefined, expiresOn: r.expires_on ?? undefined })),
    meals: (check(meals) ?? []).map((r: any): MealRow => ({ id: r.id, mealType: r.meal_type, eatenAt: r.eaten_at, description: r.description, kcal: r.kcal, isEstimate: r.is_estimate })),
  };
}
export async function saveOnboarding(userId: string, prefs: Prefs) {
  const c = db();
  check(await c.from("user_preferences").upsert({ user_id: userId, goal: prefs.goal, diet: prefs.diet, excluded_foods: prefs.excludedFoods, cooking_minutes: prefs.cookingMinutes, weekly_budget_eur: prefs.weeklyBudgetEur }));
  check(await c.from("consents").insert({ user_id: userId, purpose: "health_data_processing", granted: true, policy_version: "draft-0" }));
  check(await c.from("profiles").upsert({ id: userId, onboarding_completed: true }));
}
export async function insertMeal(userId: string, m: Omit<MealRow, "id">): Promise<string> {
  const r = check(await db().from("meal_entries").insert({ user_id: userId, meal_type: m.mealType, eaten_at: m.eatenAt, description: m.description, kcal: m.kcal, is_estimate: m.isEstimate }).select("id").single());
  return (r as { id: string }).id;
}
export async function insertPantry(userId: string, p: Pantry): Promise<string> {
  const r = check(await db().from("pantry_items").insert({ user_id: userId, name: p.name, quantity: p.quantity ?? null, unit: p.unit ?? null, expires_on: p.expiresOn ?? null }).select("id").single());
  return (r as { id: string }).id;
}
export async function deletePantry(id: string) { check(await db().from("pantry_items").delete().eq("id", id)); }
export async function deleteAllMyData(userId: string) {
  const c = db();
  for (const t of ["meal_entries", "pantry_items", "meal_suggestions", "shopping_lists", "habits", "progress_entries", "ai_memories", "work_schedules", "consents"]) check(await c.from(t).delete().eq("user_id", userId));
  check(await c.from("user_preferences").delete().eq("user_id", userId));
  check(await c.from("profiles").delete().eq("id", userId));
}

/** Elimina l'account (e a cascata tutti i dati) tramite Edge Function con ruolo di servizio. */
export async function deleteAccount() {
  const { error } = await db().functions.invoke("delete-account", { body: { confirm: "ELIMINA" } });
  if (error) throw new Error("delete_failed");
  await db().auth.signOut();
}
