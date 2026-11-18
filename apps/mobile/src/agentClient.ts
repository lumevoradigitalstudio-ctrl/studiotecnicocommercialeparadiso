import { runAgent, DemoProvider, InMemoryQuota, type DataAccess } from "@ritmo/ai";
import type { AppState, MealRow } from "./store";

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
