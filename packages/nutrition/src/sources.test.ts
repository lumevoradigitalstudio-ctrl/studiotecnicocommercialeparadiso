import { describe, it, expect, vi } from "vitest";
import { parseOpenFoodFacts, parseUsda, searchFoods, searchUsda, searchOpenFoodFacts, toEnglishQuery, QueryInput, TtlCache, FoodSourceError } from "./sources";
import { estimateRecipe } from "./index";

// FIXTURE SCRITTE A MANO sulla base della documentazione: NON sono risposte reali delle API e i valori nutrizionali sono sintetici.
const offJson = { products: [
  { code: "111", product_name: "Pasta di prova", brands: "MarcaX", nutriments: { "energy-kcal_100g": 355, proteins_100g: 12, carbohydrates_100g: 72, fat_100g: 1.5 } },
  { code: "222", product_name: "Solo kJ", nutriments: { energy_100g: 1500, proteins_100g: 10, carbohydrates_100g: 70, fat_100g: 2 } },
  { code: "333", product_name: "Incoerente", nutriments: { "energy-kcal_100g": 50, proteins_100g: 20, carbohydrates_100g: 60, fat_100g: 30 } },
  { code: "444", product_name: "", nutriments: { "energy-kcal_100g": 100, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } },
  { code: "555", product_name: "Senza macro", nutriments: { "energy-kcal_100g": 100 } },
  { code: "666", product_name: "Oltre 100 g", nutriments: { "energy-kcal_100g": 800, proteins_100g: 60, carbohydrates_100g: 60, fat_100g: 60 } },
  "spazzatura", null,
] };
const usdaJson = { foods: [
  { fdcId: 1, description: "Egg, whole, raw (test)", foodNutrients: [{ nutrientId: 1008, value: 143 }, { nutrientId: 1003, value: 12.6 }, { nutrientId: 1004, value: 9.5 }, { nutrientId: 1005, value: 0.7 }] },
  { fdcId: 2, description: "Senza energia", foodNutrients: [{ nutrientId: 1003, value: 1 }] },
  { fdcId: "x", description: "id non valido", foodNutrients: [] },
] };
const resp = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe("parser Open Food Facts", () => {
  const r = parseOpenFoodFacts(offJson);
  it("tiene solo prodotti validi e coerenti; converte kJ→kcal; conta gli scarti", () => {
    expect(r.foods.map(f => f.id)).toEqual(["off:111", "off:222"]);
    expect(r.foods[1]!.kcal).toBeCloseTo(358.5, 0); expect(r.discarded).toBe(8 - 2);
  });
  it("ogni record porta licenza e attribuzione ODbL", () => { for (const f of r.foods) { expect(f.license).toBe("ODbL-1.0"); expect(f.attribution).toMatch(/Open Food Facts.*ODbL/); } });
  it("input non valido → vuoto, nessuna eccezione", () => { expect(parseOpenFoodFacts(null).foods).toEqual([]); expect(parseOpenFoodFacts({ products: "x" }).foods).toEqual([]); });
});
describe("parser USDA", () => {
  it("estrae i nutrienti per id, scarta record incompleti", () => {
    const r = parseUsda(usdaJson); expect(r.foods).toHaveLength(1); expect(r.foods[0]).toMatchObject({ id: "fdc:1", kcal: 143, license: "CC0-1.0" }); expect(r.discarded).toBe(2);
  });
});
describe("query", () => {
  it("validazione: troppo corta/lunga e caratteri sospetti", () => { for (const q of ["a", "x".repeat(81), "uova; drop table", "<script>", "a&api_key=1"]) expect(QueryInput.safeParse(q).success).toBe(false); expect(QueryInput.safeParse("petto di pollo").success).toBe(true); });
  it("traduzione IT→EN", () => { expect(toEnglishQuery("uova")).toBe("egg"); expect(toEnglishQuery("petto di pollo")).toBe("chicken breast"); expect(toEnglishQuery("pasta integrale")).toBe("pasta integrale"); });
});
describe("client", () => {
  it("USDA: chiave nell'header (mai nell'URL) e query tradotta", async () => {
    const f = vi.fn(async () => resp(usdaJson)) as unknown as typeof fetch;
    await searchUsda("uova", "SEGRETO", { fetchImpl: f });
    const [url, init] = (f as any).mock.calls[0]; expect(url).not.toContain("SEGRETO"); expect(init.headers["x-api-key"]).toBe("SEGRETO"); expect(url).toContain("query=egg");
  });
  it("USDA: senza chiave rifiuta", async () => { await expect(searchUsda("uova", "")).rejects.toThrow(); });
  it("OFF: user-agent identificativo senza dati personali", async () => {
    const f = vi.fn(async () => resp(offJson)) as unknown as typeof fetch; await searchOpenFoodFacts("pasta", { fetchImpl: f });
    expect((f as any).mock.calls[0][1].headers["user-agent"]).toMatch(/^RitmoAI/);
  });
  it("429/500/timeout/JSON rotto → errori tipizzati", async () => {
    const kind = async (f: typeof fetch) => searchOpenFoodFacts("pasta", { fetchImpl: f }).catch(e => (e as FoodSourceError).kind);
    expect(await kind((async () => resp({}, 429)) as unknown as typeof fetch)).toBe("rate_limited");
    expect(await kind((async () => resp({}, 500)) as unknown as typeof fetch)).toBe("http");
    expect(await kind((async () => { const e = new Error("t"); e.name = "TimeoutError"; throw e; }) as unknown as typeof fetch)).toBe("timeout");
    expect(await kind((async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch)).toBe("parse");
  });
});
describe("searchFoods", () => {
  const router = (offOk = true) => (async (u: string) => (String(u).includes("usda") ? resp(usdaJson) : offOk ? resp(offJson) : resp({}, 500))) as unknown as typeof fetch;
  it("unisce le fonti con attribuzioni", async () => {
    const r = await searchFoods("uova", { fetchImpl: router(), usdaApiKey: "k" });
    expect(r.foods.length).toBe(3); expect(r.partial).toBe(false); expect(r.attributions).toHaveLength(2);
  });
  it("una fonte in errore → risultato parziale, non errore", async () => {
    const r = await searchFoods("uova", { fetchImpl: router(false), usdaApiKey: "k" });
    expect(r.partial).toBe(true); expect(r.foods.map(f => f.source)).toEqual(["usda_fdc"]);
  });
  it("senza chiave USDA usa solo OFF; cache non salva i parziali e rispetta il TTL", async () => {
    const cache = new TtlCache<any>(1000); let n = 0; const f = (async (u: string) => { n++; return resp(offJson); }) as unknown as typeof fetch;
    await searchFoods("pasta", { fetchImpl: f, cache, now: () => 0 }); await searchFoods("pasta", { fetchImpl: f, cache, now: () => 500 }); expect(n).toBe(1);
    await searchFoods("pasta", { fetchImpl: f, cache, now: () => 2000 }); expect(n).toBe(2);
    const cache2 = new TtlCache<any>(); await searchFoods("x1", { fetchImpl: router(false), cache: cache2, usdaApiKey: "k" }); expect(cache2.get("x1")).toBeUndefined();
  });
  it("i record si integrano con estimateRecipe (stima con fonti)", async () => {
    const egg = parseUsda(usdaJson).foods[0]!; const e = estimateRecipe([{ food: egg, grams: 200 }]);
    expect(e.sources).toEqual(["usda_fdc"]); expect(e.kcal).toBeCloseTo(286, 0);
  });
});
