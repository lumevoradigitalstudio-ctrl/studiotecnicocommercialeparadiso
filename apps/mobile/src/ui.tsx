import React from "react";
import { Pressable, Text, View, TextInput, StyleSheet, type ViewStyle, type TextInputProps } from "react-native";
import { colors, radius, space, font } from "./theme";

export function Button({ label, onPress, kind = "primary", disabled }: { label: string; onPress: () => void; kind?: "primary" | "ghost"; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, kind === "ghost" ? s.ghost : s.primary, pressed && { opacity: 0.85 }, disabled && { opacity: 0.4 }]}>
      <Text style={[s.btnText, kind === "ghost" && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}
export const Title = ({ children }: { children: React.ReactNode }) => <Text accessibilityRole="header" style={s.title}>{children}</Text>;
export const H2 = ({ children }: { children: React.ReactNode }) => <Text accessibilityRole="header" style={s.h2}>{children}</Text>;
export const Body = ({ children, soft }: { children: React.ReactNode; soft?: boolean }) => <Text style={[s.body, soft && { color: colors.inkSoft }]}>{children}</Text>;
export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[s.card, style]}>{children}</View>;
export const Field = (p: TextInputProps & { label: string }) => (
  <View style={{ gap: space.xs }}><Text style={s.label}>{p.label}</Text>
    <TextInput accessibilityLabel={p.label} placeholderTextColor={colors.inkSoft} {...p} style={[s.input, p.style]} /></View>
);
export const Chip = ({ label, on, onPress, radio }: { label: string; on: boolean; onPress: () => void; radio?: boolean }) => (
  <Pressable role={radio ? "radio" : "checkbox"} aria-checked={on} aria-label={label} onPress={onPress} style={[s.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
    <Text style={{ color: on ? colors.primaryInk : colors.ink, fontSize: font.body }}>{label}</Text></Pressable>
);
export const Notice = ({ children }: { children: React.ReactNode }) => <View style={s.notice}><Text style={{ color: colors.warn, fontSize: font.small }}>{children}</Text></View>;

const s = StyleSheet.create({
  btn: { minHeight: 48, borderRadius: radius.pill, paddingHorizontal: space.lg, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: colors.primary }, ghost: { borderWidth: 1, borderColor: colors.primary },
  btnText: { color: colors.primaryInk, fontSize: font.body, fontWeight: "600" },
  title: { fontSize: font.title, fontWeight: "700", color: colors.ink }, h2: { fontSize: font.h2, fontWeight: "600", color: colors.ink },
  body: { fontSize: font.body, color: colors.ink, lineHeight: 23 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.line, gap: space.sm },
  label: { fontSize: font.small, color: colors.inkSoft },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: font.body, color: colors.ink, backgroundColor: colors.surface },
  chip: { minHeight: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md, justifyContent: "center", backgroundColor: colors.surface },
  notice: { backgroundColor: colors.warnBg, borderRadius: radius.md, padding: space.sm },
});
