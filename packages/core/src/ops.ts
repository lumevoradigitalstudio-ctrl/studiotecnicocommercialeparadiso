import { z } from "zod";

/** Handler HTTP per funzioni operative: webhook RevenueCat, metriche admin, lista d'attesa. Dipendenze iniettate → testabili. */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
async function readJson(req: Request, max = 32_000): Promise<unknown | null> { const t = await req.text(); if (t.length > max) return null; try { return JSON.parse(t); } catch { return null; } }
export function safeEqual(a: string, b: string): boolean { // confronto a tempo costante
  const n = Math.max(a.length, b.length); let d = a.length ^ b.length;
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

// ---------- RevenueCat ----------
// Formato evento basato sulla documentazione RevenueCat (NON verificato su payload reali in questa sessione).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RcBody = z.object({ event: z.object({
  id: z.string().min(1).max(100), type: z.string().min(1).max(50), app_user_id: z.string().max(200),
  event_timestamp_ms: z.number().int().positive(), expiration_at_ms: z.number().int().nullable().optional(),
  entitlement_ids: z.array(z.string()).nullable().optional(), environment: z.enum(["SANDBOX", "PRODUCTION"]).optional(),
}).passthrough() }).passthrough();

export type BillingDecision = { apply: false; reason: string } | { apply: true; active: boolean; expiresAt: string | null };
const GRANTING = new Set(["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE", "CANCELLATION"]);
/** Regola: lo stato dipende dalla scadenza dichiarata dall'evento, non dal tipo da solo (CANCELLATION = disdetta, ma l'accesso dura fino a scadenza). */
export function decideBilling(ev: { type: string; event_timestamp_ms: number; expiration_at_ms?: number | null; entitlement_ids?: string[] | null }, entitlement = "plus"): BillingDecision {
  if (ev.entitlement_ids && !ev.entitlement_ids.includes(entitlement)) return { apply: false, reason: "other_entitlement" };
  if (ev.type === "EXPIRATION") return { apply: true, active: false, expiresAt: ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null };
  if (!GRANTING.has(ev.type)) return { apply: false, reason: "ignored_type" }; // es. BILLING_ISSUE, TEST, TRANSFER: nessun cambio automatico
  const exp = ev.expiration_at_ms ?? null;
  if (exp === null) return { apply: false, reason: "no_expiration" };
  return { apply: true, active: exp > ev.event_timestamp_ms, expiresAt: new Date(exp).toISOString() };
}

export interface BillingDeps {
  webhookSecret: string; allowSandbox: boolean; entitlement?: string;
  apply(e: { eventId: string; userId: string; type: string; env: string | null; eventTs: string; active: boolean; expiresAt: string | null }): Promise<"applied" | "duplicate" | "stale" | "unknown_user">;
}
export async function handleRevenueCatWebhook(req: Request, d: BillingDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!d.webhookSecret || !safeEqual(req.headers.get("authorization") ?? "", d.webhookSecret)) return json(401, { error: "unauthorized" });
  const body = RcBody.safeParse(await readJson(req)); if (!body.success) return json(400, { error: "invalid_payload" });
  const ev = body.data.event;
  if (ev.environment === "SANDBOX" && !d.allowSandbox) return json(200, { status: "ignored", reason: "sandbox" });
  if (!UUID.test(ev.app_user_id)) return json(200, { status: "ignored", reason: "anonymous_user" });
  const dec = decideBilling(ev, d.entitlement ?? "plus");
  if (!dec.apply) return json(200, { status: "ignored", reason: dec.reason });
  try {
    const status = await d.apply({ eventId: ev.id, userId: ev.app_user_id.toLowerCase(), type: ev.type, env: ev.environment ?? null, eventTs: new Date(ev.event_timestamp_ms).toISOString(), active: dec.active, expiresAt: dec.expiresAt });
    return json(200, { status });
  } catch { return json(500, { error: "apply_failed" }); } // 5xx ⇒ RevenueCat ritenta
}

// ---------- Admin ----------
export interface AdminDeps {
  authenticate(req: Request): Promise<{ userId: string } | null>;
  getRole(userId: string): Promise<"viewer" | "owner" | null>;
  metrics(days: number): Promise<unknown>;
  audit(action: string, userId: string, meta: Record<string, unknown>): Promise<void>;
}
export async function handleAdminMetrics(req: Request, d: AdminDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const who = await d.authenticate(req); if (!who) return json(401, { error: "unauthorized" });
  const role = await d.getRole(who.userId); if (!role) return json(403, { error: "forbidden" }); // 403 = autenticato ma non admin
  const body = z.object({ days: z.number().int().min(1).max(365).default(30) }).strict().safeParse((await readJson(req)) ?? {}); if (!body.success) return json(400, { error: "invalid_request" });
  try { await d.audit("admin_metrics_viewed", who.userId, { days: body.data.days, role }); } catch { return json(500, { error: "audit_failed" }); } // niente accesso senza audit
  try { return json(200, { metrics: await d.metrics(body.data.days) }); } catch { return json(500, { error: "metrics_failed" }); }
}

// ---------- Lista d'attesa ----------
export const WAITLIST_CONSENT_VERSION = "draft-0";
export interface WaitlistDeps { insert(e: { email: string; source: string | null; consentVersion: string }): Promise<void> }
const WaitlistBody = z.object({ email: z.string().trim().toLowerCase().email().max(254), consent: z.literal(true), source: z.string().max(40).optional(), website: z.string().max(0).optional() }).strict();
export async function handleWaitlist(req: Request, d: WaitlistDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const raw = await readJson(req, 2_000);
  if (raw && typeof raw === "object" && (raw as { website?: string }).website) return json(200, { ok: true }); // honeypot: i bot non vedono differenze
  const b = WaitlistBody.safeParse(raw); if (!b.success) return json(400, { error: "invalid_request" });
  try { await d.insert({ email: b.data.email, source: b.data.source ?? null, consentVersion: WAITLIST_CONSENT_VERSION }); }
  catch (e) { if ((e as { duplicate?: boolean }).duplicate) return json(200, { ok: true }); return json(500, { error: "failed" }); } // duplicato = stessa risposta: niente enumerazione email
  return json(200, { ok: true });
}

// ---------- CORS ----------
/** CORS a lista esplicita di origini (mai "*"). Origine non ammessa → nessun header CORS (il browser blocca). */
export function withCors(handler: (r: Request) => Promise<Response>, allowed: string[]) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin"); const ok = !!origin && allowed.includes(origin);
    const h: Record<string, string> = ok ? { "access-control-allow-origin": origin!, vary: "origin", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "access-control-allow-methods": "POST, OPTIONS" } : {};
    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: h });
    const res = await handler(req); const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  };
}
