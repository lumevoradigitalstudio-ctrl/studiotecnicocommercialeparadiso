import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, H2, Body } from "../../src/ui";
import { useStore } from "../../src/store";
import { space } from "../../src/theme";

export default function Home() {
  const r = useRouter(); const { state } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const todays = state.meals.filter(m => m.eatenAt.startsWith(today));
  const h = new Date().getHours();
  const hello = h < 12 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>{hello}</H2>
      <Card><Body>Non sai cosa mangiare adesso?</Body><Button label="Chiedi a RITMO" onPress={() => r.push("/(tabs)/ritmo")} /></Card>
      <Card><H2>Oggi</H2>
        {todays.length === 0 ? <Body soft>Nessun pasto registrato.</Body> : todays.map(m => <Body key={m.id}>{m.mealType}: {m.description}</Body>)}</Card>
      <Card><H2>La tua dispensa</H2><Body soft>{state.pantry.length ? `${state.pantry.length} ingredienti salvati` : "Aggiungi gli ingredienti che hai per ricevere ricette."}</Body></Card>
    </ScrollView>
  );
}
