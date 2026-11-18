import { ScrollView, Share } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, H2, Body, Notice } from "../../src/ui";
import { useStore } from "../../src/store";
import { useAuth } from "../../src/auth";
import { remoteEnabled } from "../../src/supabase";
import { space } from "../../src/theme";

export default function Profilo() {
  const r = useRouter(); const { state, actions, error } = useStore(); const { session, signOut } = useAuth();
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>Profilo</H2>
      <Card><Body>Piano: Free</Body><Button label="Scopri RITMO Plus" onPress={() => r.push("/premium")} /></Card>
      <Card><H2>I tuoi dati</H2>
        <Body soft>{remoteEnabled ? `Account: ${session?.user.email ?? ""}. I dati sono protetti da accesso per utente.` : "Tutti i dati sono salvati solo su questo dispositivo."}</Body>
        <Button kind="ghost" label="Esporta i miei dati" onPress={() => Share.share({ message: JSON.stringify(state, null, 2) })} />
        <Button kind="ghost" label="Elimina tutti i miei dati" onPress={async () => { await actions.wipeData(); r.replace("/"); }} />
        {remoteEnabled && <Body soft>Questo cancella i tuoi dati. L'eliminazione completa dell'account richiede ancora una funzione server (non ancora disponibile): scrivi al supporto.</Body>}
        {remoteEnabled && <Button kind="ghost" label="Esci" onPress={async () => { await signOut(); r.replace("/login"); }} />}
        {error && <Body>{error}</Body>}</Card>
      <Notice>RITMO non è un servizio medico: non sostituisce medico, dietista o nutrizionista.</Notice>
    </ScrollView>
  );
}
