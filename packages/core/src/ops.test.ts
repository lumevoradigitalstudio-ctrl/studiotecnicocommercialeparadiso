import { describe, it, expect, vi } from "vitest";
import { decideBilling, handleRevenueCatWebhook, handleAdminMetrics, handleWaitlist, safeEqual, type BillingDeps } from "./ops";
import { scrubText, scrubEvent } from "./privacy";

const U = "11111111-2222-3333-4444-555555555555", NOW = 1_800_000_000_000;
const ev = (o: Record<string, unknown> = {}) => ({ event: { id: "e1", type: "INITIAL_PURCHASE", app_user_id: U, event_timestamp_ms: NOW, expiration_at_ms: NOW + 30 * 864e5, entitlement_ids: ["plus"], environment: "PRODUCTION", ...o } });
const post = (body: unknown, auth = "s3cret") => new Request("http://x", { method: "POST", headers: { authorization: auth }, body: JSON.stringify(body) });
const deps = (o: Partial<BillingDeps> = {}): BillingDeps => ({ webhookSecret: "s3cret", allowSandbox: false, apply: vi.fn(async () => "applied" as const), ...o });

describe("decideBilling", () => {
  it("acquisto/rinnovo → attivo fino alla scadenza", () => { expect(decideBilling(ev().event)).toMatchObject({ apply: true, active: true }); expect(decideBilling(ev({ type: "RENEWAL" }).event)).toMatchObject({ active: true }); });
  it("disdetta: accesso fino a scadenza; già scaduta → non attivo", () => {
    expect(decideBilling(ev({ type: "CANCELLATION" }).event)).toMatchObject({ active: true });
    expect(decideBilling(ev({ type: "CANCELLATION", expiration_at_ms: NOW - 1 }).event)).toMatchObject({ active: false });
  });
  it("EXPIRATION → non attivo; tipi sconosciuti/BILLING_ISSUE/TEST non cambiano nulla; altro entitlement ignorato; senza scadenza ignorato", () => {
    expect(decideBilling(ev({ type: "EXPIRATION" }).event)).toMatchObject({ apply: true, active: false });
    for (const t of ["BILLING_ISSUE", "TEST", "TRANSFER", "BOH"]) expect(decideBilling(ev({ type: t }).event).apply).toBe(false);
    expect(decideBilling(ev({ entitlement_ids: ["altro"] }).event).apply).toBe(false);
    expect(decideBilling(ev({ expiration_at_ms: null }).event).apply).toBe(false);
  });
});
describe("webhook RevenueCat", () => {
  it("401 con segreto errato o assente (anche se il segreto configurato è vuoto), nessuna scrittura", async () => {
    const d = deps();
    expect((await handleRevenueCatWebhook(post(ev(), "sbagliato"), d)).status).toBe(401);
    expect((await handleRevenueCatWebhook(post(ev(), ""), deps({ webhookSecret: "" }))).status).toBe(401);
    expect(d.apply).not.toHaveBeenCalled();
  });
  it("applica l'evento con l'utente preso dal payload autenticato", async () => {
    const d = deps(); const r = await handleRevenueCatWebhook(post(ev()), d);
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ status: "applied" });
    expect(d.apply).toHaveBeenCalledWith(expect.objectContaining({ eventId: "e1", userId: U, active: true }));
  });
  it("200 e nessuna scrittura per sandbox (se non ammesso), utenti anonimi, eventi ignorati", async () => {
    const d = deps();
    expect(await (await handleRevenueCatWebhook(post(ev({ environment: "SANDBOX" })), d)).json()).toMatchObject({ status: "ignored", reason: "sandbox" });
    expect(await (await handleRevenueCatWebhook(post(ev({ app_user_id: "$RCAnonymousID:abc" })), d)).json()).toMatchObject({ reason: "anonymous_user" });
    expect(await (await handleRevenueCatWebhook(post(ev({ type: "BILLING_ISSUE" })), d)).json()).toMatchObject({ reason: "ignored_type" });
    expect(d.apply).not.toHaveBeenCalled();
    expect((await handleRevenueCatWebhook(post(ev({ environment: "SANDBOX" })), deps({ allowSandbox: true }))).status).toBe(200);
  });
  it("400 su payload malformato; 500 se la scrittura fallisce (RevenueCat ritenta); 405 se non POST", async () => {
    expect((await handleRevenueCatWebhook(post({ foo: 1 }), deps())).status).toBe(400);
    expect((await handleRevenueCatWebhook(post(ev()), deps({ apply: async () => { throw new Error("x"); } }))).status).toBe(500);
    expect((await handleRevenueCatWebhook(new Request("http://x"), deps())).status).toBe(405);
  });
  it("confronto a tempo costante", () => { expect(safeEqual("abc", "abc")).toBe(true); expect(safeEqual("abc", "abd")).toBe(false); expect(safeEqual("abc", "abcd")).toBe(false); });
});
describe("admin metrics", () => {
  const mk = (role: "viewer" | "owner" | null, o = {}) => ({ authenticate: async (r: Request) => (r.headers.get("authorization") === "Bearer ok" ? { userId: "a1" } : null), getRole: async () => role, metrics: vi.fn(async () => ({ signups_total: 3 })), audit: vi.fn(async () => {}), ...o });
  const call = (d: ReturnType<typeof mk>, body: unknown = {}, auth = "Bearer ok") => handleAdminMetrics(new Request("http://x", { method: "POST", headers: { authorization: auth }, body: JSON.stringify(body) }), d);
  it("401 senza login; 403 se non admin, senza leggere metriche", async () => { const d = mk(null); expect((await call(d, {}, "Bearer no")).status).toBe(401); expect((await call(d)).status).toBe(403); expect(d.metrics).not.toHaveBeenCalled(); });
  it("admin: metriche + audit dell'accesso", async () => { const d = mk("viewer"); const r = await call(d, { days: 7 }); expect(r.status).toBe(200); expect(d.audit).toHaveBeenCalledWith("admin_metrics_viewed", "a1", { days: 7, role: "viewer" }); });
  it("se l'audit fallisce, niente metriche (fail-closed); input non valido → 400", async () => {
    const d = mk("owner", { audit: async () => { throw new Error("x"); } }); expect((await call(d)).status).toBe(500); expect(d.metrics).not.toHaveBeenCalled();
    expect((await call(mk("owner"), { days: 9999 })).status).toBe(400); expect((await call(mk("owner"), { days: 7, extra: 1 })).status).toBe(400);
  });
});
describe("lista d'attesa", () => {
  const call = (b: unknown, d = { insert: vi.fn(async () => {}) }) => handleWaitlist(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), d).then(r => ({ r, d }));
  it("richiede email valida e consenso esplicito (true)", async () => {
    for (const b of [{ email: "no" }, { email: "a@b.it" }, { email: "a@b.it", consent: false }, { email: "a@b.it", consent: true, extra: 1 }]) expect((await call(b)).r.status).toBe(400);
    const { r, d } = await call({ email: " Mario@Example.IT ", consent: true, source: "ig" }); expect(r.status).toBe(200); expect(d.insert).toHaveBeenCalledWith({ email: "mario@example.it", source: "ig", consentVersion: "draft-0" });
  });
  it("honeypot: risponde ok senza salvare; duplicato: stessa risposta (niente enumerazione)", async () => {
    const a = await call({ email: "a@b.it", consent: true, website: "http://spam" }); expect(a.r.status).toBe(200); expect(a.d.insert).not.toHaveBeenCalled();
    const dup = await call({ email: "a@b.it", consent: true }, { insert: async () => { throw Object.assign(new Error("dup"), { duplicate: true }); } } as any); expect(dup.r.status).toBe(200);
    expect((await call({ email: "a@b.it", consent: true }, { insert: async () => { throw new Error("db"); } } as any)).r.status).toBe(500);
  });
});
describe("privacy scrubbing (Sentry)", () => {
  it("rimuove email, JWT, chiavi, uuid dalle stringhe", () => {
    const s = scrubText("errore per mario.rossi@gmail.com con Bearer abcdefghijklmnop e jwt eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0NTY.abcdefghijklmnop uid 11111111-2222-3333-4444-555555555555 key sk-abcdefghijklmnopqrstu");
    expect(s).not.toMatch(/mario|abcdefghijklmnop|eyJ|1111|sk-abc/);
  });
  it("oscura chat e dati sensibili per chiave, anche annidati", () => {
    const e = scrubEvent({ message: "Ho il diabete", extra: { content: "Sono incinta", history: [{ text: "x" }], ok: "visibile" }, request: { headers: { authorization: "Bearer zzzzzzzzzz" } }, user: { email: "a@b.it" }, n: 5 });
    const j = JSON.stringify(e); expect(j).not.toMatch(/diabete|incinta|zzzz|a@b\.it/); expect(j).toContain("visibile"); expect((e as any).n).toBe(5);
  });
});

import { withCors } from "./ops";
describe("CORS", () => {
  const h = withCors(async () => new Response("ok"), ["https://ritmo.example"]);
  it("preflight: ok solo per origini in lista; nessun wildcard", async () => {
    const good = await h(new Request("http://x", { method: "OPTIONS", headers: { origin: "https://ritmo.example" } })); expect(good.status).toBe(204); expect(good.headers.get("access-control-allow-origin")).toBe("https://ritmo.example");
    expect((await h(new Request("http://x", { method: "OPTIONS", headers: { origin: "https://evil.example" } }))).status).toBe(403);
  });
  it("risposte: header solo per origine ammessa", async () => {
    expect((await h(new Request("http://x", { method: "POST", headers: { origin: "https://evil.example" } }))).headers.get("access-control-allow-origin")).toBeNull();
    expect((await h(new Request("http://x", { method: "POST", headers: { origin: "https://ritmo.example" } }))).headers.get("access-control-allow-origin")).toBe("https://ritmo.example");
  });
});
