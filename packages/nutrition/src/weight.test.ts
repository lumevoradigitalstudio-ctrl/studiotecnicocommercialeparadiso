import { describe, it, expect } from "vitest";
import { bmi, bmr, checkEligibility, buildPlan, trendWeights, weeklyRate, checkIn, type BodyProfile, type Screening } from "./weight";

const ok: Screening = { pregnantOrBreastfeeding: false, eatingDisorderHistory: false, medicalCondition: false };
const F: BodyProfile = { sex: "F", age: 40, heightCm: 165, weightKg: 80, activity: "leggero" };
const M: BodyProfile = { sex: "M", age: 35, heightCm: 180, weightKg: 95, activity: "moderato" };

describe("formule", () => {
  it("BMI e BMR (Mifflin-St Jeor)", () => { expect(bmi(80, 165)).toBe(29.4); expect(bmr(M)).toBe(Math.round(10 * 95 + 6.25 * 180 - 5 * 35 + 5)); expect(bmr(F)).toBe(Math.round(10 * 80 + 6.25 * 165 - 5 * 40 - 161)); });
});
describe("idoneità e blocchi di sicurezza", () => {
  it("minori, anamnesi di DCA, gravidanza, condizioni mediche, età avanzata, sottopeso → nessun piano e messaggio che indirizza a un professionista", () => {
    const cases: [BodyProfile, Screening, string][] = [
      [{ ...F, age: 16 }, ok, "minor"], [F, { ...ok, eatingDisorderHistory: true }, "eating_disorder"], [F, { ...ok, pregnantOrBreastfeeding: true }, "pregnancy"],
      [F, { ...ok, medicalCondition: true }, "medical"], [{ ...F, age: 80 }, ok, "age"], [{ ...F, weightKg: 45 }, ok, "underweight"],
    ];
    for (const [p, s, reason] of cases) { const e = checkEligibility(p, s); expect(e).toMatchObject({ status: "blocked", reason }); expect((e as any).message).toMatch(/medico|dietista|professionist/i); expect(buildPlan(p, s)).toBeNull(); }
  });
  it("valori implausibili respinti", () => { for (const p of [{ ...F, heightCm: 50 }, { ...F, weightKg: 5 }, { ...F, age: -3 }, { ...F, weightKg: NaN }]) expect(checkEligibility(p, ok)).toMatchObject({ status: "blocked", reason: "invalid_input" }); });
  it("BMI normale → solo mantenimento, nessun piano di deficit", () => {
    const p = { ...F, weightKg: 60 }; expect(checkEligibility(p, ok)).toMatchObject({ status: "maintenance_only" }); expect(buildPlan(p, ok)).toBeNull();
  });
  it("BMI ≥ 35 → idoneo ma con supervisione medica consigliata", () => {
    const e = checkEligibility({ ...F, weightKg: 100 }, ok); expect(e).toMatchObject({ status: "eligible", needsMedicalSupervision: true }); expect((e as any).notes[0]).toMatch(/medico/);
  });
});
describe("piano prudente", () => {
  it("rispetta deficit massimo 25%, ritmo ≤ 0,75 kg/sett e stima come intervallo", () => {
    for (const p of [F, M, { ...M, weightKg: 150 }, { ...F, pace: "dolce" as const }]) {
      const pl = buildPlan(p, ok)!; expect(pl).not.toBeNull();
      expect(pl.kcalTarget).toBeGreaterThanOrEqual(pl.tdee * 0.75 - 10); expect(pl.weeklyLossKg).toBeLessThanOrEqual(0.75); expect(pl.kcalRange[1] - pl.kcalRange[0]).toBe(200);
    }
  });
  it("soglia minima: mai sotto max(BMR, 1200 F / 1500 M)", () => {
    const small: BodyProfile = { sex: "F", age: 70, heightCm: 150, weightKg: 70, activity: "sedentario" }; // BMI 31, fabbisogno basso
    const pl = buildPlan(small, ok)!; expect(pl.kcalTarget).toBeGreaterThanOrEqual(Math.max(pl.bmr, 1200) - 10);
    const man = buildPlan({ sex: "M", age: 50, heightCm: 170, weightKg: 85, activity: "sedentario" }, ok)!; expect(man.kcalTarget).toBeGreaterThanOrEqual(1500 - 10);
  });
  it("«dolce» è più lento di «standard»", () => { expect(buildPlan({ ...F, pace: "dolce" }, ok)!.weeklyLossKg).toBeLessThanOrEqual(buildPlan({ ...F, pace: "standard" }, ok)!.weeklyLossKg); });
  it("peso obiettivo: BMI minimo 20 e stima settimane", () => {
    const pl = buildPlan({ ...F, goalWeightKg: 40 }, ok)!; expect(pl.goalWeightKg).toBe(Math.ceil(20 * 1.65 ** 2)); expect(pl.limitedBy).toContain("peso_obiettivo"); expect(pl.weeksToGoal).toBeGreaterThan(0);
    expect(buildPlan({ ...F, goalWeightKg: 90 }, ok)!.goalWeightKg).toBeNull(); // obiettivo ≥ peso attuale: ignorato
  });
  it("include sempre avvertenze e rimando a un professionista", () => { expect(buildPlan(F, ok)!.disclaimers.join(" ")).toMatch(/orientative/i); expect(buildPlan(F, ok)!.disclaimers.join(" ")).toMatch(/medico|dietista/i); });
});
describe("andamento del peso", () => {
  const mk = (kgs: number[], start = "2026-11-01") => kgs.map((kg, i) => ({ date: new Date(Date.parse(start) + i * 864e5).toISOString().slice(0, 10), kg }));
  it("attenua il rumore e segue la tendenza", () => {
    const t = trendWeights(mk([80, 80.6, 79.8, 80.4, 79.5, 80, 79.2, 79.6, 78.9]));
    expect(t.at(-1)!.trend).toBeLessThan(80); expect(t.at(-1)!.trend).toBeGreaterThan(78.9);
  });
  it("una pesata anomala sposta poco il trend", () => { const t = trendWeights(mk([80, 80, 80, 90, 80])); expect(Math.max(...t.map(x => x.trend))).toBeLessThan(80.6); });
  it("dati insufficienti → nessun ritmo; ignora valori impossibili", () => {
    expect(weeklyRate(trendWeights(mk([80, 79.9])))).toBeNull(); expect(weeklyRate(trendWeights(mk([80, 79.9, 79.8])))).toBeNull(); // 3 punti ma < 7 giorni
    expect(trendWeights([{ date: "2026-11-01", kg: 5 }, { date: "2026-11-02", kg: 500 }])).toEqual([]);
  });
  it("ritmo settimanale stimato su dati regolari", () => {
    const t = trendWeights(mk([80, 79.9, 79.8, 79.7, 79.6, 79.5, 79.4, 79.3, 79.2, 79.1])); const r = weeklyRate(t)!; expect(r).toBeLessThan(0); expect(r).toBeGreaterThan(-1.5);
  });
  it("check-in: toni corretti e nessun linguaggio colpevolizzante", () => {
    expect(checkIn(null, 80).tone).toBe("info"); expect(checkIn(-0.4, 80).tone).toBe("ok"); expect(checkIn(0, 80).tone).toBe("ok");
    expect(checkIn(-1.5, 80)).toMatchObject({ tone: "attention" }); expect(checkIn(-1.5, 80).message).toMatch(/medico|dietista/);
    for (const r of [null, -1.5, -0.4, 0, 0.6]) expect(checkIn(r, 80).message).not.toMatch(/colpa|fallimento|devi dimagrire|sgarro|brucia/i);
    expect(checkIn(0.6, 80).message).toMatch(/Nessun problema/);
  });
});
