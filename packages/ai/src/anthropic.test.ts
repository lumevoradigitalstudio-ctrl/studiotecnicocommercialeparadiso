import { describe, it, expect, vi } from "vitest";
import { AnthropicProvider } from "./anthropic";
import { runAgent } from "./agent";
import { InMemoryQuota } from "./budget";

const price = { input: 1, output: 5 };
const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("AnthropicProvider (fetch simulato, nessuna rete)", () => {
  it("ciclo tool_use → tool_result → testo, con id correttamente propagati e costo misurato", async () => {
    const calls: any[] = [];
    const fetchImpl = vi.fn(async (_u: any, init: any) => {
      const body = JSON.parse(init.body); calls.push({ body, headers: init.headers });
      return calls.length === 1
        ? resp({ content: [{ type: "tool_use", id: "tu_1", name: "get_pantry_items", input: {} }], usage: { input_tokens: 100, output_tokens: 10 } })
        : resp({ content: [{ type: "text", text: "Frittata di patate. Valori: stima." }], usage: { input_tokens: 200, output_tokens: 40 } });
    }) as unknown as typeof fetch;
    const provider = new AnthropicProvider({ apiKey: "test-key", model: "m", pricePerMTokEur: price, fetchImpl });
    const r = await runAgent("Ho uova e patate", { provider, quota: new InMemoryQuota(), plan: "free",
      ctx: { userId: "u1", confirmed: false, data: { getPreferences: async () => ({}), getSchedule: async () => ({}), getPantry: async () => [{ name: "Uova" }], searchFood: async () => [], saveMeal: async () => ({ id: "1" }), upsertPantry: async () => {} } } });
    expect(r.text).toMatch(/Frittata/); expect(r.demo).toBe(false); expect(r.toolsUsed).toEqual(["get_pantry_items"]);
    expect(r.costEur).toBeCloseTo((300 * 1 + 50 * 5) / 1e6, 10);
    expect(calls[0].headers["x-api-key"]).toBe("test-key");
    expect(calls[0].body.tools.length).toBeGreaterThan(0); expect(calls[0].body.tools[0].input_schema.type).toBe("object");
    const second = calls[1].body.messages;
    expect(second.at(-2).content[0]).toMatchObject({ type: "tool_use", id: "tu_1" });
    expect(second.at(-1).content[0]).toMatchObject({ type: "tool_result", tool_use_id: "tu_1" });
    expect(second.at(-1).content[0].content).toContain("<untrusted"); // output tool incapsulato come dato
  });
  it("errore HTTP → risposta di cortesia, nessun dettaglio trapelato, slot rilasciato", async () => {
    const fetchImpl = vi.fn(async () => resp({ error: "boom with user data" }, 500)) as unknown as typeof fetch;
    const provider = new AnthropicProvider({ apiKey: "k", model: "m", pricePerMTokEur: price, fetchImpl });
    const q = new InMemoryQuota();
    const d = { provider, quota: q, plan: "free" as const, ctx: { userId: "u", confirmed: false, data: {} as any } };
    const r = await runAgent("ciao", d); expect(r.blocked).toBe("provider_error"); expect(r.text).not.toMatch(/boom/);
    expect((await runAgent("ciao", d)).blocked).toBe("provider_error"); // non "quota_concurrency": lo slot è stato rilasciato
  });
  it("rifiuta configurazione senza chiave", () => { expect(() => new AnthropicProvider({ apiKey: "", model: "m", pricePerMTokEur: price })).toThrow(); });
});
