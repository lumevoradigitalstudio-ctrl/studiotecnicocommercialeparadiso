import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radius } from "./theme";

const ND = Platform.OS !== "web"; // il driver nativo non esiste sul web
export function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => { let on = true; AccessibilityInfo.isReduceMotionEnabled().then(v => on && setR(v)).catch(() => {}); const s = AccessibilityInfo.addEventListener("reduceMotionChanged", setR); return () => { on = false; s.remove(); }; }, []);
  return r;
}
const loop = (v: Animated.Value, ms: number, yoyo = false) => Animated.loop(yoyo
  ? Animated.sequence([Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }), Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: ND })])
  : Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: ND }));

const TILT = "58deg";
/** Scena pseudo-3D: piatto inclinato in prospettiva con sfere che orbitano e barre «ritmo» che pulsano. Solo trasformazioni di base (nessun motore 3D). */
export function Hero3D({ size = 220 }: { size?: number }) {
  const reduce = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current, bob = useRef(new Animated.Value(0)).current;
  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.35))).current;
  useEffect(() => {
    if (reduce) return;
    const anims = [loop(spin, 14000), loop(bob, 2400, true)];
    bars.forEach((b, i) => anims.push(Animated.loop(Animated.sequence([
      Animated.timing(b, { toValue: 1, duration: 520 + i * 130, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      Animated.timing(b, { toValue: 0.3, duration: 620 + i * 90, easing: Easing.inOut(Easing.quad), useNativeDriver: ND })]))));
    anims.forEach(a => a.start()); return () => anims.forEach(a => a.stop());
  }, [reduce]);
  const lift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const S = size, plate = S * 0.86;
  // Orbita ellittica campionata: le sfere restano tonde e crescono/si riducono con la «profondità» (sin).
  const N = 36, cx = S / 2, cy = S * 0.29, rx = S * 0.31, ry = S * 0.15;
  const track = (phase: number, f: (a: number) => number) => spin.interpolate({ inputRange: Array.from({ length: N + 1 }, (_, i) => i / N), outputRange: Array.from({ length: N + 1 }, (_, i) => f(2 * Math.PI * (i / N + phase))) });
  const sphere = (color: string, d: number, phase: number, key: string) => (
    <Animated.View key={key} style={{ position: "absolute", left: cx - d / 2, top: cy - d / 2, width: d, height: d, transform: [{ translateX: track(phase, a => Math.cos(a) * rx) }, { translateY: track(phase, a => Math.sin(a) * ry) }, { scale: track(phase, a => 1 + 0.22 * Math.sin(a)) }] }}>
      <Animated.View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color, transform: [{ translateY: lift }], shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 6 } }}>
        <View style={{ position: "absolute", left: d * 0.2, top: d * 0.16, width: d * 0.3, height: d * 0.3, borderRadius: d, backgroundColor: "rgba(255,255,255,0.55)" }} />
      </Animated.View>
    </Animated.View>);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={{ width: S, height: S * 0.78, alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <View style={{ position: "absolute", bottom: S * 0.04, width: S * 0.92, height: S * 0.24, borderRadius: S, backgroundColor: "rgba(0,0,0,0.14)" }} />
      <View style={{ position: "absolute", top: S * 0.255, width: plate, height: plate * 0.5, borderRadius: S, backgroundColor: "#1F4D3E" }} />
      <View style={{ width: plate, height: plate, transform: [{ perspective: 700 }, { rotateX: TILT }], marginTop: -plate * 0.22 }}>
        <View style={{ position: "absolute", inset: 0, borderRadius: plate, backgroundColor: colors.bg, borderWidth: plate * 0.045, borderColor: "#E4EEE8" } as ViewStyle} />
        <View style={{ position: "absolute", left: plate * 0.2, top: plate * 0.2, right: plate * 0.2, bottom: plate * 0.2, borderRadius: plate, borderWidth: 2, borderColor: colors.line }} />
      </View>
      {sphere(colors.accent, S * 0.17, 0, "a")}{sphere("#E3A93C", S * 0.13, 1 / 3, "b")}{sphere(colors.primary, S * 0.15, 2 / 3, "c")}
      <View style={{ position: "absolute", top: S * 0.02, flexDirection: "row", alignItems: "flex-end", gap: 5, height: S * 0.3 }}>
        {bars.map((b, i) => <Animated.View key={i} style={{ width: 9, height: S * 0.3, borderRadius: 5, backgroundColor: i % 2 ? colors.accent : colors.primary, transformOrigin: "bottom", transform: [{ scaleY: b }] } as never} />)}
      </View>
    </View>
  );
}

/** Ingresso morbido (dissolvenza + salita) con ritardo, per sfalsare gli elementi di una schermata. */
export function Rise({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const reduce = useReducedMotion(); const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (reduce) { v.setValue(1); return; } Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, [reduce]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

/** Card con profondità: ombra a strati e inclinazione 3D alla pressione. */
export function Card3D({ children, onPress, label, style }: { children: React.ReactNode; onPress?: () => void; label?: string; style?: ViewStyle }) {
  const p = useRef(new Animated.Value(0)).current; const reduce = useReducedMotion();
  const to = (x: number) => !reduce && Animated.spring(p, { toValue: x, useNativeDriver: ND, speed: 30, bounciness: 6 }).start();
  const body = (
    <Animated.View style={[s.card3d, style, { transform: [{ perspective: 800 }, { rotateX: p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "5deg"] }) }, { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }] }]}>{children}</Animated.View>);
  if (!onPress) return body;
  return <Pressable role="button" aria-label={label} onPress={onPress} onPressIn={() => to(1)} onPressOut={() => to(0)}>{body}</Pressable>;
}

/** Numero che «sale» fino al valore (si ferma subito con «riduci animazioni»). */
export function CountUp({ value, style, suffix = "" }: { value: number; style?: object; suffix?: string }) {
  const reduce = useReducedMotion(); const [v, setV] = useState(reduce ? value : 0); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { setV(value); return; }
    a.setValue(0); const id = a.addListener(({ value: x }) => setV(Math.round(x))); Animated.timing(a, { toValue: value, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [value, reduce]);
  return <Text style={style}>{v}{suffix}</Text>;
}

export interface ChartPoint { x: number; raw: number; trend: number }
/** Grafico dell'andamento (peso grezzo = puntini, andamento = linea che si disegna). Disegnato con View: nessuna libreria grafica. */
export function TrendChart({ points, width = 300, height = 150, label }: { points: ChartPoint[]; width?: number; height?: number; label: string }) {
  const reduce = useReducedMotion(); const g = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => { if (reduce) { g.setValue(1); return; } g.setValue(0); Animated.timing(g, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, [points.length, reduce]);
  if (points.length < 2) return <View accessibilityLabel={label} style={[s.chartEmpty, { width, height }]}><Text style={{ color: colors.inkSoft, textAlign: "center" }}>Registra almeno due pesate per vedere l'andamento.</Text></View>;
  const pad = 14, all = points.flatMap(p => [p.raw, p.trend]), min = Math.min(...all) - 0.5, max = Math.max(...all) + 0.5;
  const X = (x: number) => pad + ((x - points[0]!.x) / Math.max(1, points[points.length - 1]!.x - points[0]!.x)) * (width - 2 * pad);
  const Y = (y: number) => pad + (1 - (y - min) / Math.max(0.1, max - min)) * (height - 2 * pad);
  const segs = points.slice(1).map((p, i) => { const a = points[i]!, x1 = X(a.x), y1 = Y(a.trend), x2 = X(p.x), y2 = Y(p.trend); return { x1, y1, len: Math.hypot(x2 - x1, y2 - y1), ang: Math.atan2(y2 - y1, x2 - x1) }; });
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={[s.chart, { width, height }]}>
      {points.map((p, i) => <View key={`r${i}`} style={{ position: "absolute", left: X(p.x) - 3, top: Y(p.raw) - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: "#C9D3CD" }} />)}
      <Animated.View style={{ position: "absolute", left: 0, top: 0, width, height, opacity: g }}>
        {segs.map((sg, i) => <View key={`s${i}`} style={{ position: "absolute", left: sg.x1, top: sg.y1 - 1.5, width: sg.len, height: 3, borderRadius: 2, backgroundColor: colors.primary, transformOrigin: "left center", transform: [{ rotate: `${sg.ang}rad` }] } as never} />)}
        <View style={{ position: "absolute", left: X(points[points.length - 1]!.x) - 6, top: Y(points[points.length - 1]!.trend) - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 2, borderColor: "#fff" }} />
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  card3d: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 8, shadowColor: "#1F2A24", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  chart: { backgroundColor: colors.sage, borderRadius: radius.md, overflow: "hidden" },
  chartEmpty: { backgroundColor: colors.sage, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: 16 },
});
