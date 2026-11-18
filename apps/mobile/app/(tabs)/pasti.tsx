import { useState } from "react";
import { ScrollView, View } from "react-native";
import { MealEntryInput, MealType } from "@ritmo/core";
import { Button, Card, Field, H2, Body, Chip } from "../../src/ui";
import { useStore } from "../../src/store";
import { space } from "../../src/theme";

export default function Pasti() {
  const { state, actions, error } = useStore();
  const [type, setType] = useState<MealType>("pranzo"); const [desc, setDesc] = useState(""); const [kcal, setKcal] = useState("");
  const parsed = MealEntryInput.safeParse({ mealType: type, eatenAt: new Date().toISOString(), description: desc, kcal: kcal ? Number(kcal) : null });
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>Registra un pasto</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{(["colazione", "pranzo", "cena", "spuntino"] as const).map(t => <Chip key={t} label={t} on={type === t} onPress={() => setType(t)} />)}</View>
      <Field label="Cosa hai mangiato?" value={desc} onChangeText={setDesc} />
      <Field label="Calorie (facoltativo, stima)" value={kcal} onChangeText={setKcal} keyboardType="number-pad" />
      <Button label="Salva pasto" disabled={!parsed.success} onPress={async () => { if (!parsed.success) return; await actions.addMeal(parsed.data); setDesc(""); setKcal(""); }} />
      {error && <Body>{error}</Body>}
      <H2>Storico</H2>
      {state.meals.length === 0 && <Body soft>Ancora nessun pasto.</Body>}
      {state.meals.map(m => <Card key={m.id}><Body>{m.mealType} — {m.description}</Body>{m.kcal != null && <Body soft>~{m.kcal} kcal (stima)</Body>}</Card>)}
    </ScrollView>
  );
}
