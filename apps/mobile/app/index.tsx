import { View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Button, Title, Body, Notice } from "../src/ui";
import { useStore } from "../src/store";
import { useAuth } from "../src/auth";
import { remoteEnabled } from "../src/supabase";
import { space } from "../src/theme";

export default function Welcome() {
  const r = useRouter(); const { state, ready } = useStore(); const { session } = useAuth();
  if (!ready) return null;
  if (remoteEnabled && !session) return <Redirect href="/login" />;
  if (state.onboarded) return <Redirect href="/(tabs)/home" />;
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: space.lg, gap: space.lg }}>
      <Title>RITMO AI</Title>
      <Body>Mangia bene, anche quando la vita cambia programma.</Body>
      <Body soft>Un assistente che ti aiuta a decidere cosa mangiare adesso, con quello che hai e con i tuoi orari. Non è un medico né un dietista.</Body>
      <Button label="Inizia (meno di 3 minuti)" onPress={() => r.push("/onboarding")} />
      <Notice>{remoteEnabled ? "Versione di sviluppo: assistente in modalità DEMO." : "Versione di sviluppo: dati salvati solo su questo dispositivo, assistente in modalità DEMO."}</Notice>
    </View>
  );
}
