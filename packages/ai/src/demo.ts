import type { LLMProvider, ProviderRequest, ProviderResponse } from "./provider";

/** Adapter DEMO: deterministico, nessuna chiamata di rete. Le risposte sono marcate come demo. */
export class DemoProvider implements LLMProvider {
  readonly name = "demo"; readonly isDemo = true;
  readonly pricePerMTokEur = { input: 0, output: 0 };
  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    const last = [...req.messages].reverse().find(m => m.role === "user" || m.role === "tool");
    const usage = { inputTokens: Math.ceil(req.messages.reduce((a, m) => a + m.content.length, 0) / 4), outputTokens: 60 };
    if (last?.role === "tool") {
      let pantry: string[] = [];
      try { const j = JSON.parse(last.content.replace(/^<untrusted[^>]*>|<\/untrusted>$/g, "")); if (Array.isArray(j)) pantry = j.map((x: { name: string }) => x.name); } catch { /* ignora */ }
      const names = pantry.map(p => p.toLowerCase());
      const has = (s: string) => names.some(n => n.includes(s));
      const text = has("uov") && has("patat")
        ? "Con quello che hai: frittata di patate e uova (2 porzioni). Pela e taglia a dadini 300 g di patate, cuocile 10 min in padella, aggiungi 4 uova sbattute e cuoci 8 min. Con insalata e pomodori è un pasto completo. Valori nutrizionali: stima da confermare."
        : "Dimmi qualche ingrediente in più e ti propongo qualcosa di semplice.";
      return { text: `[DEMO] ${text}`, usage };
    }
    const q = (last?.content ?? "").toLowerCase();
    if (/(ho\s+|dispensa|ingredient|frigo)/.test(q) && /(uova|patate|frigo|dispensa)/.test(q))
      return { toolCalls: [{ name: "get_pantry_items", args: {} }], usage };
    if (/fame|cosa mangio/.test(q)) return { text: "[DEMO] Dato l'orario, qualcosa di leggero e veloce: yogurt con frutta e una manciata di frutta secca, oppure un panino con tonno e insalata. Cosa hai a disposizione?", usage };
    if (/pizza/.test(q)) return { text: "[DEMO] Nessun problema, capita! Alla prossima occasione continua con la tua routine normale: nessuna compensazione necessaria.", usage };
    return { text: "[DEMO] Dimmi pure: posso aiutarti a decidere cosa mangiare, usare ciò che hai in dispensa o organizzare i pasti di domani.", usage };
  }
}
