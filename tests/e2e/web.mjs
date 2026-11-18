// E2E landing + admin con rete simulata (nessuna chiamata reale). Uso: node tests/e2e/web.mjs <landingUrl> <adminUrl>
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const [landing, adminUrl] = process.argv.slice(2);
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const b = await chromium.launch(); const ctx = await b.newContext(); const errs = [];
// --- landing
let p = await ctx.newPage(); p.on("pageerror", e => errs.push(String(e)));
let hits = []; await p.route("https://wl.test/**", r => { hits.push(JSON.parse(r.request().postData() ?? "{}")); r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }); });
await p.addInitScript(() => { Object.defineProperty(window, "RITMO", { configurable: true, get: () => ({ WAITLIST_URL: "https://wl.test/waitlist" }), set() {} }); });
await p.goto(landing);
ok(await p.getByText("Non è un servizio medico", { exact: false }).first().isVisible(), "landing: disclaimer non-medico visibile");
ok(!/(testimonial|recensioni|migliaia|\d+\s?utenti)/i.test(await p.textContent("body")), "landing: nessuna prova sociale/numero inventato");
await p.getByLabel("La tua email").fill("non-valida"); await p.getByRole("button", { name: "Iscrivimi" }).click();
ok(await p.getByText("Inserisci un'email valida.").isVisible() && hits.length === 0, "landing: email non valida rifiutata lato client");
await p.getByLabel("La tua email").fill("mario@example.it"); await p.getByRole("button", { name: "Iscrivimi" }).click();
ok(await p.getByText("serve il tuo consenso").isVisible() && hits.length === 0, "landing: senza consenso non invia");
await p.getByLabel(/Acconsento/).check(); await p.getByRole("button", { name: "Iscrivimi" }).click();
await p.getByText("Grazie!").waitFor(); ok(hits.length === 1 && hits[0].consent === true && hits[0].email === "mario@example.it", "landing: invio con consenso esplicito");
await p.unroute("https://wl.test/**"); await p.route("https://wl.test/**", r => r.fulfill({ status: 500, body: "{}" }));
await p.getByLabel("La tua email").fill("a@example.it"); await p.getByLabel(/Acconsento/).check(); await p.getByRole("button", { name: "Iscrivimi" }).click();
await p.getByText("Non è stato possibile completare l'iscrizione").waitFor(); ok(true, "landing: errore server mostrato senza dettagli");
// --- admin
p = await ctx.newPage(); p.on("pageerror", e => errs.push(String(e)));
const SB = "https://euxcajovjuzbdjxdckbe.supabase.co"; let mode = "badlogin";
await p.route(SB + "/auth/v1/token**", r => r.fulfill(mode === "badlogin" ? { status: 400, body: "{}" } : { status: 200, contentType: "application/json", body: '{"access_token":"tok-test"}' }));
let auth = null; await p.route(SB + "/functions/v1/admin-metrics", r => { auth = r.request().headers()["authorization"]; r.fulfill(mode === "nonadmin" ? { status: 403, body: "{}" } : { status: 200, contentType: "application/json", body: JSON.stringify({ metrics: { generated_at: "2026-11-18T00:00:00Z", signups_total: 12, signups_window: 5, onboarding_completed: 9, active_users_7d: 4, active_users_30d: 8, plus_active: 2, cancellations_window: 1, ai_requests_window: 40, ai_failed_window: 1, ai_cost_eur_window: 0.1234, revenue_estimate: null } }) }); });
await p.goto(adminUrl); const login = async () => { await p.getByLabel("Email").fill("owner@example.it"); await p.getByLabel("Password").fill("x"); await p.getByRole("button", { name: "Accedi" }).click(); };
await login(); await p.getByText("Accesso non riuscito.").waitFor(); ok(true, "admin: login errato → messaggio generico");
mode = "nonadmin"; await login(); await p.getByText("non ha accesso").waitFor(); ok(true, "admin: utente non admin (403) → nessuna metrica");
ok(await p.locator("#tbl tr").count() === 0, "admin: nessun dato mostrato al non admin");
mode = "ok"; await p.reload(); await login(); await p.getByText("Registrazioni totali").waitFor();
ok(auth === "Bearer tok-test", "admin: chiamata con il JWT dell'utente");
ok((await p.getByRole("row", { name: /Costo AI nel periodo/ }).textContent()).includes("0.1234"), "admin: metriche mostrate");
ok((await p.getByRole("row", { name: /Ricavi stimati/ }).textContent()).includes("non disponibili"), "admin: ricavi dichiarati non disponibili (non inventati)");
const store = await p.evaluate(() => JSON.stringify({ l: { ...localStorage }, s: { ...sessionStorage }, c: document.cookie })); ok(!store.includes("tok-test"), "admin: token non persistito in storage/cookie");
ok(!/@/.test(await p.locator("#tbl").textContent()), "admin: nessuna email nelle metriche");
ok(errs.length === 0, "nessun errore JS " + errs.join("|")); await b.close();
