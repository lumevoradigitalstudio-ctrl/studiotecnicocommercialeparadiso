import { useMemo, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { bmi, buildPlan, checkEligibility, checkIn, trendWeights, weeklyRate, PRO_ADVICE, type Activity, type BodyProfile, type Pace, type Screening, type Sex } from "@ritmo/nutrition";
import { shiftPlan } from "@ritmo/ai";
import { Body, Button, Card, Chip, Field, H2, Notice } from "../../src/ui";
import { Card3D, CountUp, Rise, TrendChart } from "../../src/fx";
import { useStore } from "../../src/store";
import { colors, radius, space } from "../../src/theme";

const num = (s: string) => Number(s.replace(",", ".").trim());
const ACT: [Activity, string][] = [["sedentario", "Poco attivo"], ["leggero", "Leggero"], ["moderato", "Moderato"], ["intenso", "Intenso"]];
const LIMITS: Record<string, string> = {
  soglia_minima: "Abbiamo mantenuto un minimo di calorie, per la tua sicurezza.",
  deficit_massimo: "Abbiamo limitato la riduzione, per restare graduali.",
  peso_obiettivo: "Abbiamo adattato il peso obiettivo per restare in un intervallo salutare.",
};
const dayIdx = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 864e5);

export default function Obiettivo() {
  const { state, actions, error } = useStore(); const w = state.weight;
  const [editing, setEditing] = useState(false); const [blocked, setBlocked] = useState<string | null>(null); const [consent, setConsent] = useState(false);
  // modulo
  const [sex, setSex] = useState<Sex>(w.body?.sex ?? "F"); const [age, setAge] = useState(String(w.body?.age ?? "")); const [h, setH] = useState(String(w.body?.heightCm ?? ""));
  const [kg, setKg] = useState(String(w.body?.weightKg ?? "")); const [goal, setGoal] = useState(String(w.body?.goalWeightKg ?? "")); const [act, setAct] = useState<Activity>(w.body?.activity ?? "leggero"); const [pace, setPace] = useState<Pace>(w.body?.pace ?? "standard");
  const [preg, setPreg] = useState(false); const [dca, setDca] = useState(false); const [med, setMed] = useState(false);
  const [s0, setS0] = useState(String(w.shift?.start ?? "")); const [s1, setS1] = useState(String(w.shift?.end ?? ""));
  const [today, setToday] = useState("");

  const body: BodyProfile | null = w.body, screening: Screening = w.screening ?? { pregnantOrBreastfeeding: false, eatingDisorderHistory: false, medicalCondition: false };
  const elig = body ? checkEligibility(body, screening) : null; const plan = body ? buildPlan(body, screening) : null;
  const trend = useMemo(() => trendWeights(w.entries), [w.entries]); const rate = weeklyRate(trend); const ci = checkIn(rate, body?.weightKg ?? trend.at(-1)?.kg ?? 70);
  const points = trend.map(t => ({ x: dayIdx(t.date), raw: t.kg, trend: t.trend }));

  async function submit() {
    const p: BodyProfile = { sex, age: num(age), heightCm: num(h), weightKg: num(kg), activity: act, pace, ...(num(goal) > 0 ? { goalWeightKg: num(goal) } : {}) };
    const sc: Screening = { pregnantOrBreastfeeding: preg, eatingDisorderHistory: dca, medicalCondition: med };
    const e = checkEligibility(p, sc);
    if (e.status === "blocked") { setBlocked(e.message); return; } // nulla viene salvato se non idoneo
    setBlocked(null); const a = num(s0), b = num(s1);
    await actions.saveWeightProfile(p, sc, a >= 0 && b > 0 && s0 !== "" && s1 !== "" && a < 24 && b <= 24 ? { start: a, end: b } : null); setEditing(false);
  }

  // 1) consenso
  if (!w.consent) return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Rise><H2>Un percorso su misura per il tuo peso</H2></Rise>
      <Rise delay={80}><Body soft>Facoltativo. Ti aiuta a darti un obiettivo graduale, a capire l'andamento nel tempo e a organizzare i pasti attorno ai tuoi orari.</Body></Rise>
      <Rise delay={140}><Card3D>
        <H2>Come funziona</H2>
        <Body>1. Ci dici qualche dato su di te (nessun obbligo di pesarti).</Body><Body>2. Ricevi una stima prudente, con un ritmo lento e sicuro.</Body>
        <Body>3. Se vuoi, registri il peso: guardiamo l'andamento, non il singolo giorno.</Body><Body>4. Ogni settimana un breve check-in, senza giudizi.</Body>
      </Card3D></Rise>
      <Rise delay={200}><Card3D>
        <H2>Per chi non è</H2>
        <Body soft>Minorenni, gravidanza o allattamento, chi ha o ha avuto disturbi alimentari, chi ha condizioni mediche o segue terapie, chi è sottopeso. In questi casi non diamo obiettivi di peso: ti consigliamo di rivolgerti a un professionista.</Body>
      </Card3D></Rise>
      <Notice>{PRO_ADVICE} RITMO non è un servizio medico: le cifre sono stime orientative e non sostituiscono il parere di un professionista.</Notice>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Switch accessibilityLabel="Consenso al trattamento dei dati sul peso" value={consent} onValueChange={setConsent} />
        <Body soft>Acconsento al trattamento di peso, altezza ed età (dati sulla salute) per calcolare il mio percorso. Posso revocare il consenso e cancellare i dati in ogni momento.</Body>
      </View>
      <Button label="Inizia" disabled={!consent} onPress={() => actions.setWeightConsent(true)} />
    </ScrollView>
  );

  // 2) modulo
  if (!body || editing) return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>I tuoi dati</H2>
      <Body soft>Servono solo per la stima. Restano su questo dispositivo{state.onboarded ? " e nel tuo account protetto" : ""}.</Body>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Chip radio label="Donna" on={sex === "F"} onPress={() => setSex("F")} /><Chip radio label="Uomo" on={sex === "M"} onPress={() => setSex("M")} />
      </View>
      <Field label="Età (anni)" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <Field label="Altezza (cm)" value={h} onChangeText={setH} keyboardType="number-pad" />
      <Field label="Peso attuale (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" />
      <Field label="Peso obiettivo (kg, facoltativo)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" />
      <Body soft>Quanto ti muovi?</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>{ACT.map(([k, l]) => <Chip key={k} radio label={l} on={act === k} onPress={() => setAct(k)} />)}</View>
      <Body soft>Ritmo desiderato</Body>
      <View style={{ flexDirection: "row", gap: space.sm }}><Chip radio label="Dolce" on={pace === "dolce"} onPress={() => setPace("dolce")} /><Chip radio label="Standard" on={pace === "standard"} onPress={() => setPace("standard")} /></View>
      <Body soft>Il tuo turno di lavoro (facoltativo): ore di inizio e fine, per esempio 16 e 24</Body>
      <View style={{ flexDirection: "row", gap: space.sm }}><View style={{ flex: 1 }}><Field label="Inizio (ora)" value={s0} onChangeText={setS0} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label="Fine (ora)" value={s1} onChangeText={setS1} keyboardType="number-pad" /></View></View>
      <H2>Qualche domanda di sicurezza</H2>
      {([[preg, setPreg, "Sono in gravidanza o allatto"], [dca, setDca, "Ho avuto disturbi del comportamento alimentare"], [med, setMed, "Ho condizioni mediche o seguo terapie"]] as const).map(([v, set, l]) => (
        <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}><Switch accessibilityLabel={l} value={v} onValueChange={set} /><Body>{l}</Body></View>))}
      {blocked && <Notice>{blocked}</Notice>}
      {error && <Body>{error}</Body>}
      <Button label="Calcola il mio percorso" disabled={!age || !h || !kg} onPress={submit} />
      {body && <Button kind="ghost" label="Annulla" onPress={() => setEditing(false)} />}
    </ScrollView>
  );

  // 3) percorso
  const add = async () => { const v = num(today); if (v > 20 && v < 400) { await actions.addWeight(v); setToday(""); } };
  const shift = w.shift ? shiftPlan({ start: w.shift.start, end: w.shift.end <= w.shift.start ? w.shift.end + 24 : w.shift.end, assumed: false }, false).split("\n") : null;
  const habits = [
    state.prefs && state.prefs.cookingMinutes <= 20 ? "Scegli ricette da 20 minuti o meno: le trovi in La mia cucina." : "Una volta a settimana, cucina una porzione in più per un pasto pronto.",
    shift ? "Porta con te uno spuntino già pronto per il turno: scegli tu quando mangiare." : "Fissa due orari regolari per i pasti principali, anche approssimativi.",
    "Dopo un pasto, 10 minuti di cammino leggero, se ti fa piacere.",
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {elig?.status === "maintenance_only" && <Rise><Card3D><H2>Mantenimento</H2><Body>{elig.message}</Body><Body soft>Indice di massa corporea: {bmi(body.weightKg, body.heightCm)}</Body></Card3D></Rise>}
      {plan && (
        <Rise>
          <View accessible accessibilityLabel={`Obiettivo calorico stimato: tra ${plan.kcalRange[0]} e ${plan.kcalRange[1]} chilocalorie al giorno`} style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.lg, gap: 6, shadowColor: "#1F2A24", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}>
            <Text style={{ color: "#CFE3D8", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 }}>Stima orientativa al giorno</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}><CountUp value={plan.kcalTarget} style={{ color: "#fff", fontSize: 44, fontWeight: "800" }} /><Text style={{ color: "#fff", fontSize: 18 }}>kcal</Text></View>
            <Text style={{ color: "#fff", fontSize: 15 }}>Intervallo {plan.kcalRange[0]}–{plan.kcalRange[1]} kcal · ritmo circa {plan.weeklyLossKg.toString().replace(".", ",")} kg a settimana</Text>
            {plan.weeksToGoal !== null && <Text style={{ color: "#CFE3D8", fontSize: 14 }}>Verso {plan.goalWeightKg} kg: circa {plan.weeksToGoal} settimane (molto indicativo)</Text>}
          </View>
        </Rise>)}
      {plan && <Rise delay={80}><Card3D>{plan.limitedBy.map(k => <Body key={k} soft>• {LIMITS[k]}</Body>)}{plan.disclaimers.map(d => <Body key={d} soft>• {d}</Body>)}</Card3D></Rise>}
      <Rise delay={140}><Card3D>
        <H2>La tua giornata su misura</H2>
        {shift ? shift.map((l, i) => <Body key={i}>{l}</Body>) : <Body>Tre pasti principali a orari regolari e uno o due spuntini leggeri se serve. Aggiungi il tuo turno per un piano più preciso.</Body>}
      </Card3D></Rise>
      <Rise delay={200}><Card3D><H2>Tre abitudini da provare</H2>{habits.map(x => <Body key={x}>• {x}</Body>)}</Card3D></Rise>
      <Rise delay={260}><Card3D>
        <H2>Il tuo peso nel tempo</H2>
        <Body soft>Pesarti è facoltativo. Il peso cambia ogni giorno: conta la linea, non il punto.</Body>
        <TrendChart points={points} label={points.length >= 2 ? `Andamento del peso: da ${points[0]!.trend} a ${points.at(-1)!.trend} kg` : "Andamento del peso: dati insufficienti"} />
        <View accessibilityRole="alert" style={{ backgroundColor: ci.tone === "attention" ? colors.warnBg : colors.sage, borderRadius: radius.md, padding: space.sm }}><Text style={{ color: ci.tone === "attention" ? colors.warn : colors.ink, fontSize: 14 }}>{ci.message}</Text></View>
        <Field label="Peso di oggi (kg)" value={today} onChangeText={setToday} keyboardType="decimal-pad" />
        <Button label="Salva il peso di oggi" disabled={!(num(today) > 20)} onPress={add} />
        {w.entries.slice(-5).reverse().map(e => { const i = w.entries.indexOf(e); return (
          <View key={e.date} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Body>{e.date}: {e.kg} kg</Body><Button kind="ghost" label={`Elimina pesata del ${e.date}`} onPress={() => actions.removeWeight(i)} /></View>); })}
      </Card3D></Rise>
      <Button kind="ghost" label="Modifica i miei dati" onPress={() => setEditing(true)} />
      <Button kind="ghost" label="Elimina i dati sul peso e revoca il consenso" onPress={() => actions.revokeWeightData()} />
      <Notice>{PRO_ADVICE} Se ti senti stanco/a, hai capogiri o fame eccessiva, mangia di più e rivolgiti a un professionista.</Notice>
      {error && <Body>{error}</Body>}
    </ScrollView>
  );
}
