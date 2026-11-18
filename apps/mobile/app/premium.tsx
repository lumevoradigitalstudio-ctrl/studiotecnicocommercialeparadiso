import { ScrollView } from "react-native";
import { Card, H2, Body, Notice, Button } from "../src/ui";
import { space } from "../src/theme";

export default function Premium() {
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>RITMO Plus</H2>
      <Card><Body>• Più messaggi con l'assistente (con limiti dichiarati, non illimitati)</Body><Body>• Pianificazione flessibile e gestione turni</Body><Body>• Analisi delle abitudini</Body></Card>
      <Body soft>Prezzi ipotizzati (non definitivi): €9,90/mese o €69/anno.</Body>
      <Notice>Acquisti non ancora attivi: RevenueCat non è configurato in questa versione di sviluppo.</Notice>
      <Button label="Acquisti non disponibili" disabled onPress={() => {}} />
    </ScrollView>
  );
}
