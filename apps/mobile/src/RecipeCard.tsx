import { useState } from "react";
import { View } from "react-native";
import { scaleRecipe, shoppingList, type RecipeMatch } from "@ritmo/core";
import { Button, Card, H2, Body } from "./ui";
import { space } from "./theme";

const fmt = (i: { amount: number; unit: string }) => (i.unit === "qb" ? "q.b." : `${i.amount} ${i.unit === "pz" ? "pz" : i.unit}`);

export function RecipeCard({ match, pantry }: { match: RecipeMatch; pantry: string[] }) {
  const { recipe, have, missing } = match;
  const [open, setOpen] = useState(false); const [servings, setServings] = useState(recipe.servings);
  const scaled = scaleRecipe(recipe, servings);
  const toBuy = shoppingList([{ recipe, servings }], pantry);
  return (
    <Card>
      <H2>{recipe.title}</H2>
      <Body soft>{recipe.minutes} min · hai {have.length} di {have.length + missing.length} ingredienti principali</Body>
      <Button kind="ghost" label={open ? `Chiudi ${recipe.title}` : `Vedi ${recipe.title}`} onPress={() => setOpen(o => !o)} />
      {open && (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Button kind="ghost" label="Meno porzioni" disabled={servings <= 1} onPress={() => setServings(s => s - 1)} />
            <Body>{servings} porzioni</Body>
            <Button kind="ghost" label="Più porzioni" disabled={servings >= 12} onPress={() => setServings(s => s + 1)} />
          </View>
          {scaled.ingredients.map(i => <Body key={i.name}>• {i.name}: {fmt(i)}</Body>)}
          {recipe.steps.map((st, n) => <Body key={n}>{n + 1}. {st}</Body>)}
          {recipe.alternatives?.map(a => <Body key={a} soft>Variante: {a}</Body>)}
          <H2>Da comprare</H2>
          {toBuy.length === 0 ? <Body soft>Hai già tutto.</Body> : toBuy.map(i => <Body key={i.name}>• {i.name}: {fmt(i)}</Body>)}
          <Body soft>Valori nutrizionali: non ancora disponibili. Ricetta in revisione.</Body>
        </View>)}
    </Card>
  );
}
