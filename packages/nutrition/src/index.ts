/** Calcoli nutrizionali deterministici: l'LLM NON è fonte delle quantità. */
export interface FoodPer100g { name: string; kcal: number; protein: number; carbs: number; fat: number; source: string }
export interface Nutrients { kcal: number; protein: number; carbs: number; fat: number }
export interface Estimate extends Nutrients { isEstimate: true; kcalRange: [number, number]; sources: string[] }

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scaleFood(food: FoodPer100g, grams: number): Nutrients {
  if (!Number.isFinite(grams) || grams < 0) throw new RangeError("grams must be >= 0");
  const f = grams / 100;
  return { kcal: round1(food.kcal * f), protein: round1(food.protein * f), carbs: round1(food.carbs * f), fat: round1(food.fat * f) };
}

/** Energia attesa dai macro (Atwater 4/4/9): serve a rilevare dati incoerenti nel database. */
export function atwaterKcal(n: Pick<Nutrients, "protein" | "carbs" | "fat">): number {
  return round1(4 * n.protein + 4 * n.carbs + 9 * n.fat);
}
export function isConsistent(f: FoodPer100g, tolerance = 0.2): boolean {
  const e = atwaterKcal(f);
  if (e === 0) return f.kcal < 5;
  return Math.abs(e - f.kcal) / Math.max(e, 1) <= tolerance;
}

/** Somma ingredienti; l'incertezza (±) cresce quando le quantità sono "a occhio". */
export function estimateRecipe(items: { food: FoodPer100g; grams: number; approximate?: boolean }[], servings = 1): Estimate {
  if (servings <= 0) throw new RangeError("servings must be > 0");
  const tot = items.reduce<Nutrients>((a, i) => {
    const s = scaleFood(i.food, i.grams);
    return { kcal: a.kcal + s.kcal, protein: a.protein + s.protein, carbs: a.carbs + s.carbs, fat: a.fat + s.fat };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const spread = items.length === 0 ? 0 : items.reduce((a, i) => a + scaleFood(i.food, i.grams).kcal * (i.approximate ? 0.25 : 0.1), 0);
  const per = (x: number) => round1(x / servings);
  const kcal = per(tot.kcal);
  return {
    kcal, protein: per(tot.protein), carbs: per(tot.carbs), fat: per(tot.fat),
    isEstimate: true,
    kcalRange: [Math.max(0, Math.round(kcal - spread / servings)), Math.round(kcal + spread / servings)],
    sources: [...new Set(items.map(i => i.food.source))],
  };
}

export function scaleServings(grams: number, fromServings: number, toServings: number): number {
  if (fromServings <= 0 || toServings <= 0) throw new RangeError("servings must be > 0");
  return round1((grams / fromServings) * toServings);
}
