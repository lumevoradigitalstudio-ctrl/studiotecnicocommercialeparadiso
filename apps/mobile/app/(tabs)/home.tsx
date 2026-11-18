import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { matchRecipes } from "@ritmo/core";
import { quickIdea } from "@ritmo/ai";
import { Button, Card, H2, Body } from "../../src/ui";
import { useStore } from "../../src/store";
import { colors, radius, space } from "../../src/theme";

const Row = ({ icon, title, sub, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; sub: string; onPress: () => void }) => (
  <Pressable role="button" onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.md, minHeight: 64 }, pressed && { opacity: 0.85 }]}>
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sage, alignItems: "center", justifyContent: "center" }}><Ionicons aria-hidden name={icon} size={22} color={colors.primary} /></View>
    <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>{title}</Text><Text style={{ fontSize: 13, color: colors.inkSoft }}>{sub}</Text></View>
    <Ionicons aria-hidden name="chevron-forward" size={20} color={colors.inkSoft} />
  </Pressable>
);

export default function Home() {
  const r = useRouter(); const { state } = useStore();
  const now = new Date(); const h = now.getHours();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todays = state.meals.filter(m => m.eatenAt.startsWith(today));
  const hello = h < 12 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
  const { slot, idea } = quickIdea(h);
  const best = matchRecipes(state.pantry.map(p => p.name), { excluded: state.prefs?.excludedFoods, limit: 1 })[0];
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <View style={{ gap: 2 }}><Text style={{ fontSize: 30, fontWeight: "800", color: colors.ink }}>{hello}</Text><Text style={{ fontSize: 15, color: colors.inkSoft }}>Mangia bene, anche quando la vita cambia programma.</Text></View>
      <View style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
        <Text style={{ color: "#CFE3D8", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 }}>Ora: {slot}</Text>
        <Text style={{ color: colors.primaryInk, fontSize: 18, lineHeight: 25, fontWeight: "600" }}>{best ? `Con la tua dispensa: ${best.recipe.title} (${best.recipe.minutes} min).` : `Un'idea semplice: ${idea}.`}</Text>
        <Pressable role="button" aria-label="Chiedi a RITMO" onPress={() => r.push("/(tabs)/ritmo")} style={{ alignSelf: "flex-start", backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: 44, justifyContent: "center", marginTop: space.xs }}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>Chiedi a RITMO</Text></Pressable>
      </View>
      <Row icon="restaurant-outline" title="Oggi" sub={todays.length ? `${todays.length} ${todays.length === 1 ? "pasto registrato" : "pasti registrati"}` : "Nessun pasto registrato"} onPress={() => r.push("/(tabs)/pasti")} />
      <Row icon="basket-outline" title="La tua dispensa" sub={state.pantry.length ? `${state.pantry.length} ingredienti salvati` : "Aggiungi gli ingredienti che hai per ricevere ricette"} onPress={() => r.push("/(tabs)/cucina")} />
      <Row icon="leaf-outline" title="Il tuo percorso" sub="Gli ultimi 7 giorni, senza pressione" onPress={() => r.push("/(tabs)/percorso")} />
    </ScrollView>
  );
}
