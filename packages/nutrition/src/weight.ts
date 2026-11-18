/** Area «Obiettivo peso». Stime ORIENTATIVE e prudenti, non prescrizioni. Da far validare a un dietista/medico prima del lancio.
 *  Principi: solo adulti, esclusioni sanitarie, ritmo lento, soglie minime, nessun linguaggio colpevolizzante. */
export type Sex = "F" | "M";
export type Activity = "sedentario" | "leggero" | "moderato" | "intenso";
export type Pace = "dolce" | "standard";
export interface BodyProfile { sex: Sex; age: number; heightCm: number; weightKg: number; activity: Activity; goalWeightKg?: number; pace?: Pace }
export interface Screening { pregnantOrBreastfeeding: boolean; eatingDisorderHistory: boolean; medicalCondition: boolean }

const FACTOR: Record<Activity, number> = { sedentario: 1.2, leggero: 1.375, moderato: 1.55, intenso: 1.725 };
const KCAL_PER_KG = 7700; // approssimazione classica: sovrastima l'effetto reale nel tempo
const r1 = (n: number) => Math.round(n * 10) / 10;
const round10 = (n: number) => Math.round(n / 10) * 10;

export function bmi(kg: number, cm: number): number { return r1(kg / ((cm / 100) ** 2)); }
export function bmr(p: Pick<BodyProfile, "sex" | "age" | "heightCm" | "weightKg">): number { // Mifflin-St Jeor
  return Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "M" ? 5 : -161));
}

export type BlockReason = "invalid_input" | "minor" | "age" | "pregnancy" | "eating_disorder" | "medical" | "underweight";
export type Eligibility =
  | { status: "blocked"; reason: BlockReason; message: string }
  | { status: "maintenance_only"; bmi: number; message: string }
  | { status: "eligible"; bmi: number; needsMedicalSupervision: boolean; notes: string[] };

export const PRO_ADVICE = "Per un percorso sicuro e personalizzato ti consigliamo di parlarne con il tuo medico o con un dietista/nutrizionista.";
const MSG: Record<BlockReason, string> = {
  invalid_input: "Controlla i dati inseriti: alcuni valori non sono plausibili.",
  minor: `RITMO è pensato per persone maggiorenni e non fornisce indicazioni personalizzate sul peso ai minori. ${PRO_ADVICE}`,
  age: `Oltre una certa età la gestione del peso richiede supervisione medica. ${PRO_ADVICE}`,
  pregnancy: `In gravidanza e allattamento non si pianifica un percorso di dimagrimento senza il parere del medico. ${PRO_ADVICE}`,
  eating_disorder: `Grazie per avercelo detto. In questo caso non possiamo proporre obiettivi di peso: è importante essere seguiti da professionisti. ${PRO_ADVICE}`,
  medical: `Con condizioni mediche o terapie in corso il percorso va concordato con il medico. ${PRO_ADVICE}`,
  underweight: `Con questi valori non è indicato perdere peso. ${PRO_ADVICE}`,
};

export function checkEligibility(p: BodyProfile, s: Screening): Eligibility {
  const bad = !(p.age > 0 && p.age < 120) || !(p.heightCm >= 120 && p.heightCm <= 220) || !(p.weightKg >= 30 && p.weightKg <= 300);
  if (bad) return { status: "blocked", reason: "invalid_input", message: MSG.invalid_input };
  if (p.age < 18) return { status: "blocked", reason: "minor", message: MSG.minor };
  if (s.eatingDisorderHistory) return { status: "blocked", reason: "eating_disorder", message: MSG.eating_disorder };
  if (s.pregnantOrBreastfeeding) return { status: "blocked", reason: "pregnancy", message: MSG.pregnancy };
  if (s.medicalCondition) return { status: "blocked", reason: "medical", message: MSG.medical };
  if (p.age > 75) return { status: "blocked", reason: "age", message: MSG.age };
  const b = bmi(p.weightKg, p.heightCm);
  if (b < 18.5) return { status: "blocked", reason: "underweight", message: MSG.underweight };
  if (b < 25) return { status: "maintenance_only", bmi: b, message: "I tuoi valori sono nella norma: non serve perdere peso. Possiamo lavorare su abitudini regolari e mantenimento." };
  const notes = ["Le cifre sono stime orientative, non una prescrizione.", "Il peso oscilla di giorno in giorno: conta l'andamento nel tempo."];
  if (b >= 35) notes.unshift("Con un indice di massa corporea elevato è consigliata la supervisione di un medico.");
  return { status: "eligible", bmi: b, needsMedicalSupervision: b >= 35, notes };
}

export interface Plan {
  bmr: number; tdee: number; kcalTarget: number; kcalRange: [number, number];
  weeklyLossKg: number; weeksToGoal: number | null; goalWeightKg: number | null;
  limitedBy: ("soglia_minima" | "deficit_massimo" | "peso_obiettivo")[]; disclaimers: string[];
}

/** Piano prudente: deficit ≤ 25% del fabbisogno, soglia minima max(BMR, 1200 F/1500 M), BMI obiettivo ≥ 20, ritmo ≤ 0,75 kg/sett. */
export function buildPlan(p: BodyProfile, s: Screening): Plan | null {
  const e = checkEligibility(p, s); if (e.status !== "eligible") return null;
  const B = bmr(p), tdee = Math.round(B * FACTOR[p.activity]); const limitedBy: Plan["limitedBy"] = [];
  const pct = p.pace === "dolce" ? 0.0025 : 0.005;
  const wantedKgWeek = Math.min(0.75, Math.max(0.2, p.weightKg * pct));
  let deficit = (wantedKgWeek * KCAL_PER_KG) / 7;
  const maxDef = tdee * 0.25; if (deficit > maxDef) { deficit = maxDef; limitedBy.push("deficit_massimo"); }
  const floor = Math.max(B, p.sex === "F" ? 1200 : 1500);
  let target = tdee - deficit; if (target < floor) { target = floor; deficit = Math.max(0, tdee - floor); limitedBy.push("soglia_minima"); }
  const weeklyLoss = Math.floor(((deficit * 7) / KCAL_PER_KG) * 100) / 100; // troncato: mai sopra il tetto di 0,75 kg/sett
  let goal: number | null = null;
  if (p.goalWeightKg && p.goalWeightKg < p.weightKg) {
    const minGoal = Math.ceil(20 * (p.heightCm / 100) ** 2); goal = p.goalWeightKg;
    if (goal < minGoal) { goal = minGoal; limitedBy.push("peso_obiettivo"); }
  }
  const weeks = goal !== null && weeklyLoss > 0 ? Math.ceil((p.weightKg - goal) / weeklyLoss) : null;
  const kcalTarget = round10(target);
  return { bmr: B, tdee, kcalTarget, kcalRange: [kcalTarget - 100, kcalTarget + 100], weeklyLossKg: weeklyLoss, weeksToGoal: weeks, goalWeightKg: goal, limitedBy,
    disclaimers: [...e.notes, "Non sostituisce il parere di un medico o di un dietista/nutrizionista.", "Se ti senti stanco/a, hai capogiri o fame eccessiva, mangia di più e rivolgiti a un professionista."] };
}

// ---------- Andamento (trend) ----------
export interface WeightEntry { date: string; kg: number } // date: YYYY-MM-DD
export interface TrendPoint extends WeightEntry { trend: number }
const dayNum = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 864e5);

/** Media mobile esponenziale: attenua il «rumore» quotidiano (acqua, sale, ciclo). Pesate anomale (>3 kg dal trend) pesano poco. */
export function trendWeights(entries: WeightEntry[]): TrendPoint[] {
  const s = [...entries].filter(e => e.kg > 20 && e.kg < 400).sort((a, b) => a.date.localeCompare(b.date));
  const out: TrendPoint[] = []; let t: number | null = null;
  for (const e of s) {
    if (t === null) t = e.kg; else { const a: number = Math.abs(e.kg - t) > 3 ? 0.05 : 0.2; t = t + a * (e.kg - t); }
    out.push({ ...e, trend: r1(t) });
  }
  return out;
}
/** Pendenza (kg/settimana) sugli ultimi 14 giorni; null se i dati non bastano (≥3 pesate su ≥7 giorni). */
export function weeklyRate(points: TrendPoint[]): number | null {
  if (!points.length) return null;
  const last = dayNum(points[points.length - 1]!.date), w = points.filter(p => last - dayNum(p.date) <= 14);
  if (w.length < 3 || dayNum(w[w.length - 1]!.date) - dayNum(w[0]!.date) < 7) return null;
  const x0 = dayNum(w[0]!.date); let sx = 0, sy = 0; const n = w.length;
  for (const p of w) { sx += dayNum(p.date) - x0; sy += p.trend; }
  const mx = sx / n, my = sy / n; let num = 0, den = 0;
  for (const p of w) { const dx = dayNum(p.date) - x0 - mx; num += dx * (p.trend - my); den += dx * dx; }
  if (den === 0) return null;
  return Math.round((num / den) * 7 * 100) / 100;
}
export type CheckInTone = "info" | "ok" | "attention";
/** Messaggio settimanale: neutro, mai colpevolizzante. */
export function checkIn(rateKgWeek: number | null, weightKg: number): { tone: CheckInTone; message: string } {
  if (rateKgWeek === null) return { tone: "info", message: "Servono almeno 3 pesate in una settimana per vedere l'andamento. Nessuna fretta: puoi pesarti quando vuoi." };
  const pct = (rateKgWeek / weightKg) * 100;
  if (pct < -1) return { tone: "attention", message: `Il tuo peso sta scendendo più velocemente di quanto sia consigliato. Prova a mangiare un po' di più e, se puoi, parlane con un medico o un dietista. ${PRO_ADVICE}` };
  if (pct < -0.1) return { tone: "ok", message: "L'andamento è in linea con un ritmo graduale. Continua con la tua routine." };
  if (pct <= 0.1) return { tone: "ok", message: "Il peso è stabile. Le oscillazioni sono normali: guarda l'andamento nel tempo, non il singolo giorno." };
  return { tone: "info", message: "Il peso è leggermente salito: succede, soprattutto per acqua e variazioni quotidiane. Nessun problema, si guarda l'andamento di più settimane." };
}
