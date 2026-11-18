import { ScrollView, Share } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, H2, Body, Notice } from "../../src/ui";
import { useStore } from "../../src/store";
import { space } from "../../src/theme";

export default function Profilo() {
  const r = useRouter(); const { state, reset } = useStore();
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>Profilo</H2>
      <Card><Body>Piano: Free</Body><Button label="Scopri RITMO Plus" onPress={() => r.push("/premium")} /></Card>
      <Card><H2>I tuoi dati</H2>
        <Body soft>Tutti i dati sono salvati solo su questo dispositivo.</Body>
        <Button kind="ghost" label="Esporta i miei dati" onPress={() => Share.share({ message: JSON.stringify(state, null, 2) })} />
        <Button kind="ghost" label="Elimina tutti i miei dati" onPress={async () => { await reset(); r.replace("/"); }} /></Card>
      <Notice>RITMO non è un servizio medico: non sostituisce medico, dietista o nutrizionista.</Notice>
    </ScrollView>
  );
}
