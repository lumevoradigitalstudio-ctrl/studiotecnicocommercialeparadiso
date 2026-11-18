import { z } from "zod";
import { isConsistent, type FoodPer100g } from "./index";

/** Fonti dati alimentari. Regole di licenza (verificare su fonti ufficiali prima del rilascio, vedi docs/compliance.md):
 *  - Open Food Facts: ODbL → attribuzione obbligatoria dove si mostrano i dati; share-alike se si pubblica un database derivato.
 *    Per questo i dati OFF sono usati SOLO a query-time e NON vengono fusi/archiviati in un nostro database.
 *  - USDA FoodData Central: dominio pubblico/CC0 secondo fonti terze (da confermare sul sito ufficiale). Chiave API: solo lato server.
 *  - CREA: condizioni d'uso non verificate → NON utilizzato. */
export type Source = "open_food_facts" | "usda_fdc";
export interface FoodRecord extends FoodPer100g { id: string; source: Source; license: "ODbL-1.0" | "CC0-1.0"; attribution: string; brand?: string }

export const ATTRIBUTION: Record<Source, string> = {
  open_food_facts: "Dati: Open Food Facts (licenza ODbL) — https://world.openfoodfacts.org",
  usda_fdc: "Dati: USDA FoodData Central — https://fdc.nal.usda.gov",
};
const num = z.coerce.number().finite().nonnegative();
const KJ_PER_KCAL = 4.184;
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface ParseResult { foods: FoodRecord[]; discarded: number }

/** Parser difensivo: scarta prodotti senza nome o senza macro, o con energia incoerente con i macro (±25%, margine per fibre/alcol). */
export function parseOpenFoodFacts(json: unknown): ParseResult {
  const parsed = z.object({ products: z.array(z.unknown()).default([]) }).safeParse(json);
  if (!parsed.success) return { foods: [], discarded: 0 };
  const foods: FoodRecord[] = []; let discarded = 0;
  for (const raw of parsed.data.products) {
    const p = z.object({ code: z.string().optional(), product_name: z.string().trim().min(1).max(120), brands: z.string().max(120).optional(),
      nutriments: z.object({ "energy-kcal_100g": num.optional(), energy_100g: num.optional(), proteins_100g: num, carbohydrates_100g: num, fat_100g: num }).passthrough() }).safeParse(raw);
    if (!p.success) { discarded++; continue; }
    const n = p.data.nutriments;
    const kcal = n["energy-kcal_100g"] ?? (n.energy_100g !== undefined ? n.energy_100g / KJ_PER_KCAL : undefined);
    if (kcal === undefined || kcal > 900) { discarded++; continue; }
    const f: FoodPer100g = { name: p.data.product_name, kcal: r1(kcal), protein: r1(n.proteins_100g), carbs: r1(n.carbohydrates_100g), fat: r1(n.fat_100g), source: "open_food_facts" };
    if (n.proteins_100g + n.carbohydrates_100g + n.fat_100g > 100.5 || !isConsistent(f, 0.25)) { discarded++; continue; }
    foods.push({ ...f, id: `off:${p.data.code ?? p.data.product_name}`, source: "open_food_facts", license: "ODbL-1.0", attribution: ATTRIBUTION.open_food_facts, brand: p.data.brands });
  }
  return { foods, discarded };
}

const NUTRIENT = { kcal: 1008, protein: 1003, fat: 1004, carbs: 1005 } as const; // id nutrienti FDC (da verificare su risposta reale)
export function parseUsda(json: unknown): ParseResult {
  const parsed = z.object({ foods: z.array(z.unknown()).default([]) }).safeParse(json);
  if (!parsed.success) return { foods: [], discarded: 0 };
  const foods: FoodRecord[] = []; let discarded = 0;
  for (const raw of parsed.data.foods) {
    const p = z.object({ fdcId: z.number().int(), description: z.string().trim().min(1).max(160), brandOwner: z.string().max(120).optional(),
      foodNutrients: z.array(z.object({ nutrientId: z.number().optional(), value: z.number().optional() }).passthrough()).default([]) }).safeParse(raw);
    if (!p.success) { discarded++; continue; }
    const get = (id: number) => p.data.foodNutrients.find(x => x.nutrientId === id)?.value;
    const [kcal, protein, fat, carbs] = [get(NUTRIENT.kcal), get(NUTRIENT.protein), get(NUTRIENT.fat), get(NUTRIENT.carbs)];
    if ([kcal, protein, fat, carbs].some(v => v === undefined || v < 0) || kcal! > 900) { discarded++; continue; }
    const f: FoodPer100g = { name: p.data.description, kcal: r1(kcal!), protein: r1(protein!), carbs: r1(carbs!), fat: r1(fat!), source: "usda_fdc" };
    if (!isConsistent(f, 0.25)) { discarded++; continue; }
    foods.push({ ...f, id: `fdc:${p.data.fdcId}`, source: "usda_fdc", license: "CC0-1.0", attribution: ATTRIBUTION.usda_fdc, brand: p.data.brandOwner });
  }
  return { foods, discarded };
}

/** Traduzione minima IT→EN per interrogare USDA (solo inglese). Copertura limitata, deterministica, da estendere. */
export const IT_EN: Record<string, string> = {
  uova: "egg", uovo: "egg", patate: "potato", patata: "potato", pomodori: "tomato", pomodoro: "tomato", pasta: "pasta", riso: "rice",
  "petto di pollo": "chicken breast", pollo: "chicken", tonno: "tuna", fagioli: "beans", ceci: "chickpeas", zucchine: "zucchini", cipolla: "onion",
  mozzarella: "mozzarella", parmigiano: "parmesan cheese", latte: "milk", yogurt: "yogurt", pane: "bread", mele: "apple", mela: "apple", banana: "banana",
  insalata: "lettuce", carote: "carrot", carota: "carrot", olio: "olive oil", salmone: "salmon", lenticchie: "lentils", prosciutto: "ham",
};
export function toEnglishQuery(q: string): string {
  const k = q.trim().toLowerCase();
  if (IT_EN[k]) return IT_EN[k]!;
  return k.split(/\s+/).map(w => IT_EN[w] ?? w).join(" ");
}

export const QueryInput = z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s'’.,-]+$/u, "caratteri non ammessi");

export class FoodSourceError extends Error { constructor(readonly source: Source, readonly kind: "http" | "timeout" | "rate_limited" | "parse") { super(`${source}:${kind}`); } }

export interface ClientDeps { fetchImpl?: typeof fetch; timeoutMs?: number; userAgent?: string }
async function getJson(source: Source, url: string, init: RequestInit, d: ClientDeps): Promise<unknown> {
  const f = d.fetchImpl ?? fetch; let res: Response;
  try { res = await f(url, { ...init, signal: AbortSignal.timeout(d.timeoutMs ?? 8000) }); }
  catch (e) { throw new FoodSourceError(source, (e as Error).name === "TimeoutError" ? "timeout" : "http"); }
  if (res.status === 429) throw new FoodSourceError(source, "rate_limited");
  if (!res.ok) throw new FoodSourceError(source, "http");
  try { return await res.json(); } catch { throw new FoodSourceError(source, "parse"); }
}

/** Nota: endpoint e parametri da verificare con una chiamata reale (rete bloccata in sviluppo). */
export async function searchOpenFoodFacts(query: string, d: ClientDeps = {}, limit = 8): Promise<ParseResult> {
  const q = QueryInput.parse(query);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,nutriments`;
  return parseOpenFoodFacts(await getJson("open_food_facts", url, { headers: { "user-agent": d.userAgent ?? "RitmoAI-dev/0.1 (contatto da definire)", accept: "application/json" } }, d));
}
export async function searchUsda(query: string, apiKey: string, d: ClientDeps = {}, limit = 8): Promise<ParseResult> {
  if (!apiKey) throw new Error("apiKey USDA mancante");
  const q = toEnglishQuery(QueryInput.parse(query));
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${limit}&dataType=Foundation,SR%20Legacy`;
  return parseUsda(await getJson("usda_fdc", url, { headers: { "x-api-key": apiKey, accept: "application/json" } }, d));
}

export interface SearchDeps extends ClientDeps { usdaApiKey?: string; cache?: TtlCache<SearchOutput>; now?: () => number }
export interface SearchOutput { foods: FoodRecord[]; attributions: string[]; partial: boolean; discarded: number }

export class TtlCache<T> {
  private m = new Map<string, { v: T; exp: number }>();
  constructor(private ttlMs = 6 * 3600_000, private max = 500) {}
  get(k: string, now = Date.now()) { const e = this.m.get(k); if (!e || e.exp <= now) { this.m.delete(k); return undefined; } return e.v; }
  set(k: string, v: T, now = Date.now()) { if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value as string); this.m.set(k, { v, exp: now + this.ttlMs }); }
}

/** Cerca in USDA (alimenti generici, se c'è la chiave) e Open Food Facts (prodotti confezionati). Una fonte che fallisce → risultato parziale, mai errore totale. */
export async function searchFoods(query: string, d: SearchDeps = {}): Promise<SearchOutput> {
  const q = QueryInput.parse(query); const key = q.toLowerCase(); const now = d.now?.() ?? Date.now();
  const hit = d.cache?.get(key, now); if (hit) return hit;
  const jobs: Promise<ParseResult>[] = [searchOpenFoodFacts(q, d)];
  if (d.usdaApiKey) jobs.unshift(searchUsda(q, d.usdaApiKey, d));
  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((s): s is PromiseFulfilledResult<ParseResult> => s.status === "fulfilled").map(s => s.value);
  const foods = ok.flatMap(o => o.foods);
  const out: SearchOutput = { foods, attributions: [...new Set(foods.map(f => ATTRIBUTION[f.source]))], partial: ok.length < settled.length, discarded: ok.reduce((a, o) => a + o.discarded, 0) };
  if (!out.partial) d.cache?.set(key, out, now); // non si cacha un risultato parziale
  return out;
}
