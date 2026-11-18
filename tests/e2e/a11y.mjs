// Audit axe-core (WCAG 2.1 A/AA) su pagine statiche e schermate dell'app web. Uso: node tests/e2e/a11y.mjs <landing> <admin> <app>
import { createRequire } from "node:module"; import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const axeSrc = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const [landing, admin, app] = process.argv.slice(2); const b = await chromium.launch(); let bad = 0;
async function audit(page, name) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  const v = r.violations.map(x => `${x.id}(${x.impact}) x${x.nodes.length}`); console.log(v.length ? "FAIL" : "ok  ", "-", name, v.join(", ")); if (v.length) bad++;
}
let p = await (await b.newContext()).newPage();
await p.goto(landing); await audit(p, "landing"); await p.goto(landing.replace(/\/$/, "") + "/privacy.html"); await audit(p, "privacy (bozza)");
await p.goto(admin); await audit(p, "admin login");
await p.goto(app); await p.getByText("RITMO AI").first().waitFor(); await audit(p, "app: benvenuto");
await p.getByRole("button", { name: /Inizia/ }).click(); await p.getByText("Qual è il tuo obiettivo?").waitFor(); await audit(p, "app: onboarding");
await p.getByText("Organizzare i pasti").click(); await p.getByLabel("Consenso al trattamento delle preferenze alimentari").click(); await p.getByRole("button", { name: "Continua" }).click();
await p.getByRole("button", { name: "Chiedi a RITMO" }).waitFor(); await audit(p, "app: home");
for (const t of ["RITMO", "Pasti", "Cucina", "Percorso", "Profilo"]) { await p.getByRole("tab", { name: new RegExp("^"+t) }).click(); await p.waitForTimeout(250); await audit(p, "app: " + t); }
await b.close(); process.exit(bad ? 1 : 0);
