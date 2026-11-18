import { describe, it, expect } from "vitest";
import { scaleFood, estimateRecipe, isConsistent, atwaterKcal, scaleServings, type FoodPer100g } from "./index";

// Valori di test sintetici (NON sono dati di riferimento di database reali).
const uovo: FoodPer100g = { name: "uovo", kcal: 140, protein: 12.5, carbs: 0.5, fat: 9.5, source: "test" };
const patata: FoodPer100g = { name: "patata", kcal: 77, protein: 2, carbs: 17, fat: 0.1, source: "test" };

describe("nutrition", () => {
  it("scala per grammi", () => { expect(scaleFood(patata, 300).kcal).toBe(231); expect(scaleFood(patata, 0).kcal).toBe(0); });
  it("rifiuta grammi negativi", () => { expect(() => scaleFood(patata, -1)).toThrow(RangeError); });
  it("coerenza Atwater", () => { expect(atwaterKcal(uovo)).toBeCloseTo(137.5, 1); expect(isConsistent(uovo)).toBe(true); expect(isConsistent({ ...uovo, kcal: 400 })).toBe(false); });
  it("stima ricetta con intervallo e porzioni", () => {
    const e = estimateRecipe([{ food: patata, grams: 300 }, { food: uovo, grams: 200, approximate: true }], 2);
    expect(e.isEstimate).toBe(true);
    expect(e.kcal).toBe(255.5);
    expect(e.kcalRange[0]).toBeLessThan(e.kcal); expect(e.kcalRange[1]).toBeGreaterThan(e.kcal);
    expect(e.sources).toEqual(["test"]);
  });
  it("incertezza maggiore con quantità approssimative", () => {
    const a = estimateRecipe([{ food: patata, grams: 300 }]);
    const b = estimateRecipe([{ food: patata, grams: 300, approximate: true }]);
    expect(b.kcalRange[1] - b.kcalRange[0]).toBeGreaterThan(a.kcalRange[1] - a.kcalRange[0]);
  });
  it("scala porzioni", () => { expect(scaleServings(600, 2, 3)).toBe(900); expect(() => scaleServings(1, 0, 1)).toThrow(); });
});
