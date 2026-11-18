import { describe, it, expect } from "vitest";
import { RECIPES, norm, matchRecipes, scaleRecipe, shoppingList, isVegetarian } from "./recipes";

describe("catalogo", () => {
  it("id unici, porzioni e tempi sensati, passaggi presenti, nessun valore nutrizionale inventato", () => {
    expect(new Set(RECIPES.map(r => r.id)).size).toBe(RECIPES.length);
    for (const r of RECIPES) { expect(r.servings).toBeGreaterThan(0); expect(r.minutes).toBeGreaterThan(0); expect(r.steps.length).toBeGreaterThan(1); expect(r).not.toHaveProperty("kcal"); expect(r).not.toHaveProperty("nutrition"); }
  });
});
describe("normalizzazione", () => {
  it("singolare/plurale e accenti", () => { expect(norm("Uova")).toBe(norm("uovo")); expect(norm("Patate")).toBe(norm("patata")); expect(norm("Pomodori")).toBe(norm("pomodoro")); expect(norm("Caffè")).toBe("caff"); });
});
describe("abbinamento con la dispensa", () => {
  it("scenario B: uova, patate, prosciutto, pomodori, insalata → frittata e insalata di patate in testa", () => {
    const m = matchRecipes(["uova", "patate", "prosciutto crudo", "pomodori", "insalata"]);
    expect(m[0]!.coverage).toBe(1); expect(m.slice(0, 3).map(x => x.recipe.id)).toContain("frittata-patate");
    expect(m.every(x => x.have.length > 0)).toBe(true);
  });
  it("indica correttamente cosa manca; i condimenti base non contano", () => {
    const m = matchRecipes(["pomodori"]).find(x => x.recipe.id === "pasta-pomodoro")!;
    expect(m.missing).toEqual(expect.arrayContaining(["pasta"])); expect(m.missing).not.toContain("sale");
  });
  it("rispetta gli alimenti esclusi (anche al singolare/plurale)", () => {
    const ids = matchRecipes(["uova", "patate", "pomodori"], { excluded: ["uovo"] }).map(x => x.recipe.id);
    expect(ids).not.toContain("frittata-patate"); expect(ids).not.toContain("uova-pomodoro");
  });
  it("filtro vegetariano e tempo massimo", () => {
    expect(matchRecipes(["tonno in scatola", "fagioli cannellini cotti", "petto di pollo", "insalata"], { vegetarian: true }).every(m => isVegetarian(m.recipe))).toBe(true);
    expect(matchRecipes(["pomodori", "uova", "patate", "mozzarella"], { maxMinutes: 15 }).every(m => m.recipe.minutes <= 15)).toBe(true);
  });
  it("dispensa vuota o senza corrispondenze → nessuna ricetta (niente suggerimenti inventati)", () => { expect(matchRecipes([])).toEqual([]); expect(matchRecipes(["cioccolato"])).toEqual([]); });
});
describe("porzioni e lista della spesa", () => {
  it("scala le quantità, lasciando invariato 'quanto basta'", () => {
    const f = scaleRecipe(RECIPES.find(r => r.id === "frittata-patate")!, 4);
    expect(f.ingredients.find(i => i.name === "patate")!.amount).toBe(600); expect(f.ingredients.find(i => i.name === "sale")!.unit).toBe("qb");
    expect(() => scaleRecipe(RECIPES[0]!, 0)).toThrow(RangeError); expect(() => scaleRecipe(RECIPES[0]!, 99)).toThrow(RangeError);
  });
  it("lista: solo ciò che manca, scalato, senza condimenti base", () => {
    const r = RECIPES.find(x => x.id === "pasta-pomodoro")!;
    expect(shoppingList([{ recipe: r, servings: 4 }], ["pomodori"])).toEqual([{ name: "pasta", amount: 320, unit: "g" }, { name: "basilico", amount: 8, unit: "pz" }]);
  });
  it("unisce le voci duplicate tra più ricette", () => {
    const a = RECIPES.find(x => x.id === "frittata-patate")!, b = RECIPES.find(x => x.id === "insalata-uova-patate")!;
    const l = shoppingList([{ recipe: a, servings: 2 }, { recipe: b, servings: 2 }], []);
    expect(l.find(i => i.name === "patate")!.amount).toBe(600); expect(l.find(i => i.name === "uova")!.amount).toBe(6);
  });
});
