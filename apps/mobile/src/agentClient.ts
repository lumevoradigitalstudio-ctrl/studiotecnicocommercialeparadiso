import { runAgent, DemoProvider, InMemoryQuota, type DataAccess } from "@ritmo/ai";
import type { AppState, MealRow } from "./store";
import { supabase } from "./supabase";
import { MealEntryInput } from "@ritmo/core";

export interface ChatReply { text: string; demo: boolean; blocked?: string | null; mealProposals: ReturnType<typeof MealEntryInput.parse>[] }

/** Modalità remota: assistente reale via Edge Function (JWT utente). Le scritture arrivano solo come proposte. */
export async function askRemote(text: string, state: AppState): Promise<ChatReply> {
  if (!supabase) throw new Error("backend non configurato");
  const { data, error, response } = await supabase.functions.invoke("ritmo-chat", { body: { message: text, history: state.chat.slice(-10).map(c => ({ role: c.role, content: c.text })) } });
  if (response?.status === 429 && data?.text) return { text: data.text, demo: false, blocked: data.blocked, mealProposals: [] };
  if (error || !data) return { text: response?.status === 503 ? "L'assistente non è ancora disponibile. Riprova più tardi." : "Al momento non riesco a rispondere. Riprova tra poco.", demo: false, blocked: "unavailable", mealProposals: [] };
  const mealProposals = (data.proposals ?? []).filter((p: { name: string }) => p.name === "save_meal_entry").map((p: { args: unknown }) => MealEntryInput.safeParse(p.args)).filter((r: { success: boolean }) => r.success).map((r: { data: never }) => r.data);
  return { text: data.text, demo: !!data.demo, blocked: data.blocked, mealProposals };
}

const quota = new InMemoryQuota(); // in produzione: funzione SQL consume_ai_quota via Edge Function
const provider = new DemoProvider(); // sostituire con un provider reale server-side (Edge Function)

export async function askRitmo(text: string, state: AppState, onSaveMeal: (m: MealRow) => void, confirmed = false) {
  const data: DataAccess = {
    getPreferences: async () => state.prefs ?? {}, getSchedule: async () => [],
    getPantry: async () => state.pantry.map(p => ({ name: p.name })), searchFood: async () => [],
    saveMeal: async (_u, meal) => { const row = { ...meal, id: String(Date.now()) }; onSaveMeal(row); return { id: row.id }; },
    upsertPantry: async () => {},
  };
  return runAgent(text, { provider, quota, plan: "free", ctx: { userId: "local-user", data, confirmed }, history: state.chat.slice(-10).map(c => ({ role: c.role, content: c.text })) });
}
