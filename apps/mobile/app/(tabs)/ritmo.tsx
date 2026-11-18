import { useState } from "react";
import { View, Text, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Field, Notice } from "../../src/ui";
import { useStore } from "../../src/store";
import { askRitmo } from "../../src/agentClient";
import { colors, radius, space } from "../../src/theme";

const SUGGESTIONS = ["Ho fame, cosa mangio adesso?", "Ho uova, patate e pomodori", "Oggi ho mangiato una pizza fuori programma"];

export default function Chat() {
  const { state, update } = useStore(); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  async function send(t: string) {
    const msg = t.trim(); if (!msg || busy) return; setBusy(true); setText("");
    update(s => ({ ...s, chat: [...s.chat, { role: "user", text: msg }] }));
    const r = await askRitmo(msg, state, m => update(s => ({ ...s, meals: [...s.meals, m] })));
    update(s => ({ ...s, chat: [...s.chat, { role: "assistant", text: r.text, demo: r.demo }] })); setBusy(false);
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ padding: space.md }}><Notice>Assistente DEMO (risposte predefinite, nessun modello reale collegato). Le informazioni nutrizionali sono stime e non sostituiscono il parere di un professionista.</Notice></View>
      <FlatList data={state.chat} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: space.md, gap: space.sm }}
        ListEmptyComponent={<View style={{ gap: space.sm }}>{SUGGESTIONS.map(s => <Button key={s} kind="ghost" label={s} onPress={() => send(s)} />)}</View>}
        renderItem={({ item }) => (
          <View accessibilityLabel={`${item.role === "user" ? "Tu" : "RITMO"}: ${item.text}`} style={{ alignSelf: item.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", backgroundColor: item.role === "user" ? colors.primary : colors.sage, borderRadius: radius.lg, padding: space.md }}>
            <Text style={{ color: item.role === "user" ? colors.primaryInk : colors.ink, fontSize: 16 }}>{item.text}</Text></View>)} />
      <View style={{ padding: space.md, gap: space.sm }}>
        <Field label="Scrivi a RITMO" value={text} onChangeText={setText} onSubmitEditing={() => send(text)} returnKeyType="send" />
        <Button label={busy ? "..." : "Invia"} disabled={busy || !text.trim()} onPress={() => send(text)} />
      </View>
    </KeyboardAvoidingView>
  );
}
