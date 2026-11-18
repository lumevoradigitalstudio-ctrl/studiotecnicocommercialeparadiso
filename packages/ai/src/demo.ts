import { matchRecipes, norm } from "@ritmo/core";
import type { LLMProvider, ProviderRequest, ProviderResponse } from "./provider";

/** Assistente LOCALE a regole (nessun modello AI, nessuna rete): deterministico, prevedibile, marcato [DEMO].
 *  Serve a rendere l'app utilizzabile senza chiavi; verrà sostituito dal provider reale lato server. */
const pad = (n: number) => String(n).padStart(2, "0");
const hh = (h: number) => `${pad(((h % 24) + 24) % 24)}:00`;
const list = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} e ${a[a.length - 1]}`);

export type Slot = "colazione" | "spuntino mattutino" | "pranzo" | "merenda" | "cena" | "cena tardiva" | "notte";
export function slotFor(hour: number): Slot {
  if (hour >= 5 && hour < 10) return "colazione"; if (hour >= 10 && hour < 12) return "spuntino mattutino";
  if (hour >= 12 && hour < 15) return "pranzo"; if (hour >= 15 && hour < 18) return "merenda";
  if (hour >= 18 && hour < 22) return "cena"; if (hour >= 22 && hour < 24) return "cena tardiva"; return "notte";
}
const GENERIC: Record<Slot, string> = {
  colazione: "yogurt con frutta e qualche cereale, oppure pane con marmellata o ricotta e un caffè/tè",
  "spuntino mattutino": "un frutto, uno yogurt o una piccola manciata di frutta secca",
  pranzo: "un piatto semplice di pasta o riso con verdure, oppure un'insalata sostanziosa con legumi o uova",
  merenda: "un frutto con yogurt, un panino piccolo o frutta secca",
  cena: "una minestra o un piatto di verdure con uova, legumi o pesce, e un po' di pane",
  "cena tardiva": "qualcosa di leggero e semplice: una frittata veloce, uno yogurt con frutta, un panino con tonno e insalata",
  notte: "qualcosa di leggero e facile da preparare: yogurt, un frutto, qualche cracker con formaggio fresco",
};

/** Estrae ingredienti da frasi tipo «Ho uova, patate e pomodori». */
export function parseIngredients(text: string): string[] {
  const m = text.match(/\b(?:ho|abbiamo|in frigo (?:ho|c'è|ci sono)|dispensa:?)\s+(.+)$/i); if (!m) return [];
  const BAN = /^(fame|sete|voglia|poco|poca|tempo|cosa|bisogno|sonno|freddo|caldo|paura|dubbi|un problema)\b|mangio|adesso|oggi|domani|stasera/i;
  return m[1]!.split("?")[0]!.replace(/[.!]+$/, "").split(/\s*,\s*|\s+e\s+/i).map(s => s.trim()).filter(s => s.length >= 3 && s.length <= 40 && !BAN.test(s));
}

export interface Shift { start: number; end: number; assumed: boolean }
export function parseShift(text: string): Shift | null {
  const t = text.toLowerCase();
  const m = t.match(/dalle?\s+(\d{1,2})(?::\d{2})?\s*(?:alle?|a|fino\s+a(?:lle)?)\s+(mezzanotte|\d{1,2})(?::\d{2})?/);
  if (m) { const s = Number(m[1]), e = m[2] === "mezzanotte" ? 24 : Number(m[2]); if (s < 24 && e <= 24) return { start: s, end: e <= s ? e + 24 : e, assumed: false }; }
  if (/tutto il pomeriggio|nel pomeriggio/.test(t)) return { start: 14, end: 19, assumed: true };
  if (/tutta la mattina|di mattina|in mattinata/.test(t)) return { start: 7, end: 13, assumed: true };
  if (/di sera|tutta la sera|serale/.test(t)) return { start: 18, end: 24, assumed: true };
  if (/di notte|notturno|turno di notte/.test(t)) return { start: 22, end: 30, assumed: true };
  return null;
}
export function shiftPlan(s: Shift, tomorrow: boolean): string {
  const dur = s.end - s.start, when = tomorrow ? "domani" : "oggi";
  const lines: string[] = [`Ecco una proposta modificabile per ${when}${s.assumed ? ` (ho assunto il turno dalle ${hh(s.start)} alle ${hh(s.end)}: correggimi se è diverso)` : ` (turno ${hh(s.start)}–${hh(s.end)})`}:`];
  lines.push(`• Prima del turno (verso le ${hh(s.start - 2)}): un pasto vero e completo, così parti senza fame. Per esempio ${GENERIC.pranzo}.`);
  if (dur >= 4) lines.push(`• Durante il turno (a metà, verso le ${hh(s.start + Math.floor(dur / 2))}): uno spuntino portatile già pronto: ${GENERIC["spuntino mattutino"]}. Averne 1-2 in borsa aiuta a scegliere tu quando mangiare, invece di piluccare in continuazione.`);
  if (dur >= 8) lines.push(`• Pausa lunga: un secondo piccolo pasto da portare da casa, ad esempio un panino o un'insalata di riso/legumi.`);
  lines.push(s.end >= 21 ? `• Dopo il turno (verso le ${hh(s.end)}): ${GENERIC["cena tardiva"]}. Se riesci, prepara tutto in anticipo.` : `• Dopo il turno: una cena normale e semplice.`);
  lines.push("Non sono indicazioni mediche né un piano dietetico: adattale ai tuoi gusti. Vuoi che le adatti a ciò che hai in dispensa?");
  return lines.join("\n");
}

function recipeText(pantry: string[]): string | null {
  const m = matchRecipes(pantry, { limit: 1 })[0]; if (!m) return null;
  const r = m.recipe;
  return `Con ciò che hai puoi fare: ${r.title} (${r.minutes} min, ${r.servings} porzioni).\nHai: ${list(m.have)}.${m.missing.length ? ` Ti manca: ${list(m.missing)}.` : ""}\n${r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nValori nutrizionali: non ancora disponibili. Posso salvarlo tra i tuoi pasti quando l'hai preparato.`;
}

export class DemoProvider implements LLMProvider {
  readonly name = "demo"; readonly isDemo = true; readonly pricePerMTokEur = { input: 0, output: 0 };
  constructor(private opts: { now?: () => Date } = {}) {}
  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    const usage = { inputTokens: Math.ceil(req.messages.reduce((a, m) => a + m.content.length, 0) / 4), outputTokens: 60 };
    const reply = (text: string): ProviderResponse => ({ text: `[DEMO] ${text}`, usage });
    const lastUser = [...req.messages].reverse().find(m => m.role === "user")?.content ?? "";
    const q = lastUser.toLowerCase(); const hour = (this.opts.now?.() ?? new Date()).getHours();
    const last = req.messages[req.messages.length - 1];

    if (last?.role === "tool") { // risposta dopo get_pantry_items
      let saved: string[] = []; try { const j = JSON.parse(last.content.replace(/^<untrusted[^>]*>|<\/untrusted>$/g, "")); if (Array.isArray(j)) saved = j.map((x: { name: string }) => x.name); } catch { /* ignora */ }
      const pantry = [...new Set([...saved, ...parseIngredients(lastUser)].map(s => s.trim()).filter(Boolean))];
      if (/fame|cosa mangio|mangiare adesso/.test(q)) {
        const slot = slotFor(hour), rt = pantry.length ? recipeText(pantry) : null;
        return reply(rt ? `È il momento di ${slot}. ${rt}` : `È il momento di ${slot}: ${GENERIC[slot]}. ${pantry.length ? "Dimmi cosa hai e lo adatto." : "Cosa hai a disposizione in casa? Così ti propongo qualcosa di preciso."}`);
      }
      return reply(recipeText(pantry) ?? "Con questi ingredienti non ho una ricetta nel mio catalogo. Dimmi qualcosa in più (pasta, riso, uova, verdure…) e ci provo.");
    }
    if (/pizza|dolce|gelato|sgarr|fuori programma|fuori pasto/.test(q)) return reply("Nessun problema, capita! Alla prossima occasione continua con la tua routine normale: nessuna compensazione necessaria. Se vuoi, ti propongo un prossimo pasto semplice.");
    const shift = /(lavoro|turno|servizio|apertura|chiusura)/.test(q) ? parseShift(lastUser) : null;
    if (shift) return reply(shiftPlan(shift, /domani/.test(q)));
    if (/organizz\w*.*pasti|pasti.*organizz/.test(q)) return reply("Dimmi a che ora inizi e finisci di lavorare (per esempio «lavoro dalle 16 a mezzanotte») e ti preparo una proposta di pasti.");
    if (parseIngredients(lastUser).length >= 2 || /dispensa|frigo|ingredient/.test(q) || /fame|cosa mangio|mangiare adesso/.test(q))
      return { toolCalls: [{ id: "demo-1", name: "get_pantry_items", args: {} }], usage };
    return reply("Posso aiutarti a decidere cosa mangiare adesso, a usare ciò che hai in dispensa o a organizzare i pasti attorno ai tuoi orari. Prova, per esempio: «Lavoro dalle 16 a mezzanotte», «Ho uova e patate» o «Ho fame».");
  }
}
void norm;
