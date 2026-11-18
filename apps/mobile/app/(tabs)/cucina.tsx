import { useState } from "react";
import { ScrollView, View } from "react-native";
import { PantryItem } from "@ritmo/core";
import { Button, Card, Field, H2, Body } from "../../src/ui";
import { useStore } from "../../src/store";
import { space } from "../../src/theme";

export default function Cucina() {
  const { state, actions, error } = useStore(); const [name, setName] = useState("");
  const parsed = PantryItem.safeParse({ name });
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>La mia dispensa</H2>
      <Field label="Aggiungi ingrediente" value={name} onChangeText={setName} onSubmitEditing={async () => { if (parsed.success) { await actions.addPantry(parsed.data); setName(""); } }} />
      <Button label="Aggiungi" disabled={!parsed.success} onPress={async () => { if (!parsed.success) return; await actions.addPantry(parsed.data); setName(""); }} />
      {error && <Body>{error}</Body>}
      {state.pantry.length === 0 && <Body soft>Dispensa vuota.</Body>}
      {state.pantry.map((p, i) => (
        <Card key={`${p.name}-${i}`}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Body>{p.name}</Body><Button kind="ghost" label={`Rimuovi ${p.name}`} onPress={() => actions.removePantry(i)} /></View></Card>))}
    </ScrollView>
  );
}
