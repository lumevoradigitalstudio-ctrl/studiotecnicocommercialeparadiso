// E2E area «Obiettivo peso»: blocchi di sicurezza, piano prudente, peso e andamento, persistenza, revoca. Uso: node tests/e2e/obiettivo.mjs <appUrl>
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] ?? "http://127.0.0.1:8099";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const b = await chromium.launch(); const errs = [];
async function fresh() { // contesto nuovo con «riduci animazioni» (anche test dell'accessibilità del movimento)
  const ctx = await b.newContext({ reducedMotion: "reduce" }); const p = await ctx.newPage(); p.on("pageerror", e => errs.push(String(e)));
  await p.goto(base); await p.getByRole("button", { name: /Inizia/ }).click(); await p.getByText("Organizzare i pasti").click();
  await p.getByLabel("Consenso al trattamento delle preferenze alimentari").click(); await p.getByRole("button", { name: "Continua" }).click();
  await p.getByRole("button", { name: "Chiedi a RITMO" }).waitFor(); await p.getByRole("tab", { name: /^Obiettivo/ }).click(); return p;
}
const consent = async p => { await p.getByLabel("Consenso al trattamento dei dati sul peso").click(); await p.getByRole("button", { name: "Inizia" }).click(); await p.getByText("I tuoi dati").waitFor(); };
const fill = async (p, v) => { for (const [l, x] of Object.entries(v)) await p.getByLabel(l).fill(String(x)); };

// 1) senza consenso non si può iniziare
let p = await fresh(); await p.getByText("Un percorso su misura per il tuo peso").waitFor();
ok(await p.getByRole("button", { name: "Inizia" }).isDisabled(), "senza consenso il percorso non parte");
ok(await p.getByText(/non è un servizio medico/i).first().isVisible(), "avviso «non è un servizio medico» visibile");

// 2) blocchi di sicurezza: nessun numero, rimando a un professionista, nulla salvato
for (const [name, ages, flag] of [["minorenne", 16, null], ["disturbi alimentari", 40, "Ho avuto disturbi del comportamento alimentare"], ["gravidanza", 32, "Sono in gravidanza o allatto"], ["condizioni mediche", 50, "Ho condizioni mediche o seguo terapie"]]) {
  const q = await fresh(); await consent(q); await fill(q, { "Età (anni)": ages, "Altezza (cm)": 165, "Peso attuale (kg)": 80 });
  if (flag) await q.getByLabel(flag).click(); await q.getByRole("button", { name: "Calcola il mio percorso" }).click();
  await q.getByText(/medico o con un dietista/).first().waitFor();
  ok((await q.getByText(/kcal/).count()) === 0, `blocco «${name}»: nessuna cifra calorica mostrata`);
  const stored = await q.evaluate(() => JSON.stringify({ ...localStorage })); ok(!/"body":\{/.test(stored), `blocco «${name}»: i dati non vengono salvati`);
}
// 3) sottopeso e valori implausibili
let q = await fresh(); await consent(q); await fill(q, { "Età (anni)": 30, "Altezza (cm)": 170, "Peso attuale (kg)": 48 }); await q.getByRole("button", { name: "Calcola il mio percorso" }).click();
await q.getByText(/non è indicato perdere peso/).waitFor(); ok(true, "sottopeso: nessun percorso di dimagrimento");
q = await fresh(); await consent(q); await fill(q, { "Età (anni)": 30, "Altezza (cm)": 50, "Peso attuale (kg)": 70 }); await q.getByRole("button", { name: "Calcola il mio percorso" }).click();
await q.getByText(/non sono plausibili/).waitFor(); ok(true, "valori implausibili respinti");
// 4) BMI normale → solo mantenimento
q = await fresh(); await consent(q); await fill(q, { "Età (anni)": 30, "Altezza (cm)": 170, "Peso attuale (kg)": 62 }); await q.getByRole("button", { name: "Calcola il mio percorso" }).click();
await q.getByRole("heading", { name: "Mantenimento" }).waitFor(); ok((await q.getByText("Stima orientativa al giorno").count()) === 0, "BMI nella norma: solo mantenimento, nessun deficit");

// 5) percorso idoneo: piano prudente, turno, peso e andamento, persistenza, revoca
q = await fresh(); await consent(q);
await fill(q, { "Età (anni)": 40, "Altezza (cm)": 165, "Peso attuale (kg)": 80, "Peso obiettivo (kg, facoltativo)": 70, "Inizio (ora)": 16, "Fine (ora)": 24 });
await q.getByRole("button", { name: "Calcola il mio percorso" }).click(); await q.getByText("Stima orientativa al giorno").waitFor();
ok(await q.getByText("Intervallo 1480–1680 kcal · ritmo circa 0,4 kg a settimana").isVisible(), "piano atteso: 1480–1680 kcal, 0,4 kg/settimana (calcolo verificato a mano)");
ok(await q.getByText(/circa 25 settimane/).isVisible(), "stima 25 settimane marcata «molto indicativa»");
ok(await q.getByText(/Non sostituisce il parere di un medico/).isVisible(), "avvertenze presenti nel piano");
ok(await q.getByText(/Prima del turno \(verso le 14:00\)/).isVisible(), "giornata su misura costruita sul turno 16–24");
const final = await q.getByLabel(/Obiettivo calorico stimato/).getAttribute("aria-label"); ok(/1480 e 1680/.test(final), "etichetta accessibile con intervallo (CountUp senza animazione con «riduci animazioni»)");
await q.getByLabel("Peso di oggi (kg)").fill("80.4"); await q.getByRole("button", { name: "Salva il peso di oggi" }).click(); await q.getByText(/: 80.4 kg/).waitFor();
ok(await q.getByText(/Servono almeno 3 pesate/).isVisible(), "con una sola pesata: nessun giudizio sull'andamento");
await q.reload(); await q.getByRole("tab", { name: /^Obiettivo/ }).click(); await q.getByText("Stima orientativa al giorno").waitFor(); ok(await q.getByText(/: 80.4 kg/).isVisible(), "dopo la riapertura piano e pesata sono ancora lì");
await q.getByRole("button", { name: "Elimina i dati sul peso e revoca il consenso" }).click(); await q.getByText("Un percorso su misura per il tuo peso").waitFor();
const after = await q.evaluate(() => localStorage.length ? JSON.stringify({ ...localStorage }) : "{}"); ok(!/"entries":\[\{/.test(after) && !/"body":\{/.test(after), "revoca: peso e profilo cancellati");
ok(errs.length === 0, "nessun errore JS " + errs.join("|")); await b.close();
