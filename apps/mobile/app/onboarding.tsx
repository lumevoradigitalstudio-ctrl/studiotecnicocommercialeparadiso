import { useState } from "react";
import { ScrollView, View, Switch, Text } from "react-native";
import { useRouter } from "expo-router";
import { UserPreferences } from "@ritmo/core";
import { Button, H2, Body, Chip, Field } from "../src/ui";
import { useStore } from "../src/store";
import { space } from "../src/theme";

const GOALS = [["mangiare_meglio", "Mangiare meglio"], ["organizzare_pasti", "Organizzare i pasti"], ["mantenimento", "Mantenermi"], ["risparmiare_tempo", "Risparmiare tempo"]] as const;
const DIETS = [["vegetariano", "Vegetariano"], ["vegano", "Vegano"], ["senza_glutine", "Senza glutine"], ["senza_lattosio", "Senza lattosio"]] as const;

export default function Onboarding() {
  const r = useRouter(); const { actions, error } = useStore();
  const [goal, setGoal] = useState<string>(""); const [diet, setDiet] = useState<string[]>([]);
  const [excluded, setExcluded] = useState(""); const [minutes, setMinutes] = useState("30"); const [notif, setNotif] = useState(false);
  const [consent, setConsent] = useState(false);
  const parsed = UserPreferences.safeParse({ goal, diet, excludedFoods: excluded.split(",").map(s => s.trim()).filter(Boolean), cookingMinutes: Number(minutes) || 0, notificationsEnabled: notif });
  const toggle = (k: string) => setDiet(d => d.includes(k) ? d.filter(x => x !== k) : [...d, k]);
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <H2>Qual è il tuo obiettivo?</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{GOALS.map(([k, l]) => <Chip key={k} label={l} on={goal === k} onPress={() => setGoal(k)} />)}</View>
      <H2>Preferenze</H2>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{DIETS.map(([k, l]) => <Chip key={k} label={l} on={diet.includes(k)} onPress={() => toggle(k)} />)}</View>
      <Field label="Alimenti da escludere (separati da virgola)" value={excluded} onChangeText={setExcluded} placeholder="es. coriandolo, tonno" />
      <Field label="Minuti disponibili per cucinare" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text accessibilityRole="text" style={{ flex: 1 }}>Promemoria per i pasti (puoi cambiarlo dopo)</Text>
        <Switch accessibilityLabel="Promemoria per i pasti" value={notif} onValueChange={setNotif} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Switch accessibilityLabel="Consenso al trattamento delle preferenze alimentari" value={consent} onValueChange={setConsent} />
        <Body soft>Acconsento al trattamento delle mie preferenze alimentari per personalizzare i suggerimenti. Posso revocarlo e cancellare i dati dal Profilo.</Body>
      </View>
      <Body soft>Non chiediamo peso né altezza: non servono per iniziare.</Body>
      <Button label="Continua" disabled={!parsed.success || !consent} onPress={async () => { if (!parsed.success) return; await actions.finishOnboarding(parsed.data); r.replace("/(tabs)/home"); }} />
      {error && <Body>{error}</Body>}
    </ScrollView>
  );
}
