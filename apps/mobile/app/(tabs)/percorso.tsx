import { ScrollView, View, Text } from "react-native";
import { Card, H2, Body } from "../../src/ui";
import { useStore } from "../../src/store";
import { colors, space } from "../../src/theme";

const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export default function Percorso() {
  const { state } = useStore();
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - (6 - k)); return d; });
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const logged = new Set(state.meals.map(m => key(new Date(m.eatenAt))));
  const n = days.filter(d => logged.has(key(d))).length;
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>Gli ultimi 7 giorni</H2>
      <Card>
        <View accessibilityLabel={`Giorni con almeno un pasto registrato: ${n} su 7`} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {days.map(d => (
            <View key={key(d)} style={{ alignItems: "center", gap: space.xs }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: logged.has(key(d)) ? colors.primary : colors.line }} />
              <Text style={{ color: colors.inkSoft, fontSize: 12 }}>{DAYS[d.getDay()]}</Text>
            </View>))}
        </View>
        <Body>{n === 0 ? "Nessun pasto registrato questa settimana: puoi ripartire quando vuoi." : `Hai registrato almeno un pasto in ${n} giorni su 7.`}</Body>
        <Body soft>Non serve registrare tutto: l'obiettivo è una routine che funzioni per te, anche nelle settimane irregolari. Nessuna serie da non interrompere.</Body>
      </Card>
      <Card><H2>Pasti più frequenti</H2>
        {(() => { const c = new Map<string, number>(); state.meals.forEach(m => c.set(m.mealType, (c.get(m.mealType) ?? 0) + 1)); const t = [...c.entries()].sort((a, b) => b[1] - a[1]);
          return t.length === 0 ? <Body soft>Ancora nessun dato.</Body> : t.map(([k, v]) => <Body key={k}>{k}: {v}</Body>); })()}
      </Card>
    </ScrollView>
  );
}
