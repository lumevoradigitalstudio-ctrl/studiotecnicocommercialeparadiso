/** Catalogo ricette e logica di abbinamento con la dispensa. Funzioni pure, testabili.
 *  Le ricette sono bozze redatte da RITMO su preparazioni tradizionali: da far revisionare. NESSUN valore nutrizionale
 *  è incluso: va calcolato da un database alimentare con licenza verificata (vedi docs/compliance.md). */
export type Unit = "g" | "ml" | "pz" | "qb";
export interface RecipeIngredient { name: string; amount: number; unit: Unit; staple?: boolean; animal?: "carne" | "pesce" }
export interface Recipe { id: string; title: string; servings: number; minutes: number; ingredients: RecipeIngredient[]; steps: string[]; alternatives?: string[] }

const ing = (name: string, amount: number, unit: Unit, extra: Partial<RecipeIngredient> = {}): RecipeIngredient => ({ name, amount, unit, ...extra });
const salt = ing("sale", 0, "qb", { staple: true }), oil = ing("olio extravergine d'oliva", 0, "qb", { staple: true }), pepper = ing("pepe", 0, "qb", { staple: true });

export const RECIPES: Recipe[] = [
  { id: "frittata-patate", title: "Frittata di patate", servings: 2, minutes: 25,
    ingredients: [ing("patate", 300, "g"), ing("uova", 4, "pz"), salt, oil],
    steps: ["Pela le patate e tagliale a dadini piccoli.", "Cuocile in padella con un filo d'olio per circa 10 minuti, finché sono tenere.", "Sbatti le uova con un pizzico di sale e versale sulle patate.", "Cuoci a fuoco medio-basso circa 8 minuti, gira e termina la cottura 3-4 minuti."],
    alternatives: ["Aggiungi cipolla o zucchine.", "Con prosciutto cotto a dadini al posto di parte delle patate."] },
  { id: "pasta-pomodoro", title: "Pasta al pomodoro fresco", servings: 2, minutes: 25,
    ingredients: [ing("pasta", 160, "g"), ing("pomodori", 400, "g"), ing("basilico", 4, "pz", { staple: false }), salt, oil],
    steps: ["Taglia i pomodori a pezzi e cuocili in padella con l'olio per 12-15 minuti.", "Lessa la pasta in acqua salata e scolala al dente.", "Unisci pasta e sugo, aggiungi il basilico e manteca un minuto."],
    alternatives: ["Con passata di pomodoro se non hai pomodori freschi."] },
  { id: "insalata-uova-patate", title: "Insalata di patate e uova", servings: 2, minutes: 30,
    ingredients: [ing("patate", 300, "g"), ing("uova", 2, "pz"), ing("insalata", 80, "g"), ing("pomodori", 150, "g"), salt, oil],
    steps: ["Lessa le patate con la buccia per 20 minuti circa; pelale e tagliale a pezzi.", "Cuoci le uova sode per 9 minuti, sgusciale e dividile a spicchi.", "Condisci tutto con insalata e pomodori, olio e sale."] },
  { id: "caprese", title: "Insalata caprese", servings: 2, minutes: 10,
    ingredients: [ing("pomodori", 300, "g"), ing("mozzarella", 250, "g"), ing("basilico", 6, "pz"), salt, oil],
    steps: ["Affetta pomodori e mozzarella.", "Alterna le fette nel piatto con il basilico.", "Condisci con olio e sale."] },
  { id: "pasta-e-ceci", title: "Pasta e ceci", servings: 2, minutes: 35,
    ingredients: [ing("ceci cotti", 300, "g"), ing("pasta corta", 120, "g"), ing("pomodori", 100, "g"), ing("aglio", 1, "pz"), ing("rosmarino", 1, "pz"), salt, oil],
    steps: ["Soffriggi aglio e rosmarino nell'olio, aggiungi i pomodori e i ceci.", "Schiaccia metà dei ceci, aggiungi acqua calda e porta a bollore.", "Cuoci la pasta direttamente nella zuppa fino a cottura, regolando di sale."] },
  { id: "risotto-zucchine", title: "Risotto alle zucchine", servings: 2, minutes: 30,
    ingredients: [ing("riso", 160, "g"), ing("zucchine", 300, "g"), ing("cipolla", 0.5, "pz"), ing("brodo vegetale", 600, "ml"), ing("parmigiano", 30, "g"), salt, oil],
    steps: ["Soffriggi la cipolla tritata, aggiungi le zucchine a rondelle e cuoci 5 minuti.", "Tosta il riso un minuto, poi aggiungi brodo caldo poco alla volta per circa 16 minuti.", "Manteca con il parmigiano fuori dal fuoco."] },
  { id: "tonno-fagioli", title: "Insalata di tonno e fagioli", servings: 2, minutes: 10,
    ingredients: [ing("fagioli cannellini cotti", 250, "g"), ing("tonno in scatola", 160, "g", { animal: "pesce" }), ing("cipolla", 0.25, "pz"), salt, oil],
    steps: ["Scola fagioli e tonno.", "Mescola con cipolla affettata sottile.", "Condisci con olio e sale."] },
  { id: "pollo-padella", title: "Petto di pollo in padella con insalata", servings: 2, minutes: 20,
    ingredients: [ing("petto di pollo", 300, "g", { animal: "carne" }), ing("insalata", 100, "g"), ing("limone", 1, "pz"), salt, pepper, oil],
    steps: ["Taglia il pollo a fettine sottili e salalo.", "Cuocilo in padella con poco olio 4-5 minuti per lato, fino a cottura completa (nessuna parte rosa).", "Servilo con insalata condita e succo di limone."] },
  { id: "uova-pomodoro", title: "Uova in purgatorio", servings: 2, minutes: 20,
    ingredients: [ing("uova", 4, "pz"), ing("pomodori", 400, "g"), ing("cipolla", 0.5, "pz"), ing("basilico", 4, "pz"), salt, oil],
    steps: ["Soffriggi la cipolla e aggiungi i pomodori a pezzi, cuoci 10 minuti.", "Crea 4 incavi e rompi un uovo in ciascuno.", "Copri e cuoci 5-6 minuti finché l'albume è rappreso."] },
];

/** Normalizzazione leggera per confrontare nomi (uova/uovo, patate/patata, pomodori/pomodoro). */
export function norm(s: string): string {
  const base = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, "").trim();
  return base.split(/\s+/).map(w => (w.length > 3 ? w.replace(/[aeio]$/, "") : w)).join(" ");
}
const matches = (a: string, b: string) => { const x = norm(a), y = norm(b); return x === y || x.includes(y) || y.includes(x); };

export function isVegetarian(r: Recipe): boolean { return !r.ingredients.some(i => i.animal); }
export const hasIngredient = (pantry: string[], name: string) => pantry.some(p => matches(p, name));

export interface RecipeMatch { recipe: Recipe; have: string[]; missing: string[]; coverage: number }

export function matchRecipes(pantry: string[], opts: { excluded?: string[]; vegetarian?: boolean; maxMinutes?: number; limit?: number } = {}): RecipeMatch[] {
  const excluded = opts.excluded ?? [];
  return RECIPES
    .filter(r => !excluded.some(e => r.ingredients.some(i => matches(e, i.name) || matches(i.name, e))))
    .filter(r => !opts.vegetarian || isVegetarian(r))
    .filter(r => !opts.maxMinutes || r.minutes <= opts.maxMinutes)
    .map(recipe => {
      const core = recipe.ingredients.filter(i => !i.staple);
      const have = core.filter(i => hasIngredient(pantry, i.name)).map(i => i.name);
      const missing = core.filter(i => !hasIngredient(pantry, i.name)).map(i => i.name);
      return { recipe, have, missing, coverage: core.length ? have.length / core.length : 1 };
    })
    .filter(m => m.have.length > 0)
    .sort((a, b) => b.coverage - a.coverage || a.missing.length - b.missing.length || a.recipe.minutes - b.recipe.minutes)
    .slice(0, opts.limit ?? 5);
}

export function scaleRecipe(r: Recipe, servings: number): Recipe {
  if (!Number.isFinite(servings) || servings <= 0 || servings > 20) throw new RangeError("servings fuori intervallo");
  const f = servings / r.servings;
  return { ...r, servings, ingredients: r.ingredients.map(i => i.unit === "qb" ? i : { ...i, amount: Math.round(i.amount * f * 10) / 10 }) };
}

export interface ShoppingItem { name: string; amount: number; unit: Unit }
/** Lista della spesa = ingredienti non-base che mancano in dispensa, scalati per porzioni. Unisce voci duplicate. */
export function shoppingList(recipes: { recipe: Recipe; servings: number }[], pantry: string[]): ShoppingItem[] {
  const acc = new Map<string, ShoppingItem>();
  for (const { recipe, servings } of recipes) {
    for (const i of scaleRecipe(recipe, servings).ingredients) {
      if (i.staple || hasIngredient(pantry, i.name)) continue;
      const key = `${norm(i.name)}|${i.unit}`; const cur = acc.get(key);
      acc.set(key, cur ? { ...cur, amount: Math.round((cur.amount + i.amount) * 10) / 10 } : { name: i.name, amount: i.amount, unit: i.unit });
    }
  }
  return [...acc.values()];
}
