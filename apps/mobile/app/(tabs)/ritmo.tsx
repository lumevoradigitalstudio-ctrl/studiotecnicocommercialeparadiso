import { useState } from "react";
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Field, Notice } from "../../src/ui";
import { useStore } from "../../src/store";
import { askRitmo, askRemote } from "../../src/agentClient";
import { remoteEnabled } from "../../src/supabase";
import type { MealEntryInput } from "@ritmo/core";
import type { z } from "zod";
import { colors, radius, space } from "../../src/theme";

const SUGGESTIONS = ["Lavoro dalle 16 a mezzanotte", "Ho fame, cosa mangio adesso?", "Ho uova, patate e pomodori", "Domani lavoro tutto il pomeriggio. Organizzami i pasti.", "Oggi ho mangiato una pizza fuori programma"];

export default function Chat() {
  const { state, update, actions } = useStore(); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [pending, setPending] = useState<z.infer<typeof MealEntryInput>[]>([]);
  async function send(t: string) {
    const msg = t.trim(); if (!msg || busy) return; setBusy(true); setText("");
    update(s => ({ ...s, chat: [...s.chat, { role: "user", text: msg }] }));
    const r = remoteEnabled ? await askRemote(msg, state) : await askRitmo(msg, state, m => { const { id: _id, ...rest } = m; void actions.addMeal(rest); });
    if ("mealProposals" in r) setPending(p => [...p, ...r.mealProposals]);
    update(s => ({ ...s, chat: [...s.chat, { role: "assistant", text: r.text, demo: r.demo }] })); setBusy(false);
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ padding: space.md }}><Notice>{remoteEnabled ? "Assistente in fase di test." : "Assistente locale a regole (modalità DEMO): niente modello AI né connessione necessari."} Le informazioni nutrizionali sono stime e non sostituiscono il parere di un professionista.</Notice></View>
      <FlatList data={state.chat} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: space.md, gap: space.sm }}
        ListEmptyComponent={<View style={{ gap: space.sm }}>{SUGGESTIONS.map(s => <Button key={s} kind="ghost" label={s} onPress={() => send(s)} />)}</View>}
        renderItem={({ item }) => (
          <View accessibilityLabel={`${item.role === "user" ? "Tu" : "RITMO"}: ${item.text}`} style={{ alignSelf: item.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: item.role === "user" ? colors.primary : colors.sage, borderRadius: radius.lg, padding: space.md }}>
            <Text style={{ color: item.role === "user" ? colors.primaryInk : colors.ink, fontSize: 16 }}>{item.text}</Text></View>)} />
      {pending.map((m, i) => (
        <View key={i} style={{ paddingHorizontal: space.md, gap: space.sm }}>
          <Text>Salvare «{m.description}» come {m.mealType}?</Text>
          <Button label="Sì, salva" onPress={async () => { await actions.addMeal(m); setPending(p => p.filter((_, j) => j !== i)); }} />
          <Button kind="ghost" label="No" onPress={() => setPending(p => p.filter((_, j) => j !== i))} />
        </View>))}
      <View style={{ padding: space.md, gap: space.sm }}>
        <Field label="Scrivi a RITMO" value={text} onChangeText={setText} onSubmitEditing={() => send(text)} returnKeyType="send" />
        <Button label={busy ? "..." : "Invia"} disabled={busy || !text.trim()} onPress={() => send(text)} />
      </View>
    </KeyboardAvoidingView>
  );
}
