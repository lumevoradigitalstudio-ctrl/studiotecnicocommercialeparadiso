import { z } from "zod";
import type { LLMProvider, ChatMessage } from "./provider";
import type { QuotaGate } from "./budget";
import type { DataAccess } from "./tools";
import { runAgent } from "./agent";
import { resolvePlan, type PlanId } from "@ritmo/core";

/** Handler HTTP indipendente dal runtime (Edge Function/Deno, Node, test). Le dipendenze reali sono iniettate. */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const MAX_BODY = 16_000;

async function readJson(req: Request): Promise<unknown | null> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export interface ChatDeps {
  /** Verifica il JWT e restituisce l'identità (mai presa dal body). */
  authenticate(req: Request): Promise<{ userId: string } | null>;
  /** Cancello quota per UNA richiesta (nel DB: consume_ai_quota/finish_ai_request). */
  makeQuota(userId: string): QuotaGate;
  provider: LLMProvider | null;
  /** DataAccess legato al JWT dell'utente ⇒ la RLS resta il controllo ultimo. */
  makeData(req: Request, userId: string): DataAccess;
  getPlan(userId: string): Promise<PlanId>;
}

const ChatBody = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(10).default([]),
}).strict();

export async function handleChat(req: Request, deps: ChatDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const who = await deps.authenticate(req);
  if (!who) return json(401, { error: "unauthorized" });
  if (!deps.provider) return json(503, { error: "assistant_unavailable" }); // nessun fallback demo silenzioso in produzione
  const body = ChatBody.safeParse(await readJson(req));
  if (!body.success) return json(400, { error: "invalid_request" });
  const plan = await deps.getPlan(who.userId);
  const history: ChatMessage[] = body.data.history.map(h => ({ role: h.role, content: h.content }));
  const r = await runAgent(body.data.message, {
    provider: deps.provider, quota: deps.makeQuota(who.userId), plan, history,
    ctx: { userId: who.userId, data: deps.makeData(req, who.userId), confirmed: false }, // scritture: solo proposte, mai eseguite qui
  });
  const status = r.blocked?.startsWith("quota_") ? 429 : 200;
  return json(status, { text: r.text, blocked: r.blocked ?? null, demo: r.demo, proposals: r.proposals ?? [] });
}

export interface DeleteDeps {
  authenticate(req: Request): Promise<{ userId: string } | null>;
  deleteUser(userId: string): Promise<void>;
  audit(action: string, userId: string): Promise<void>;
}
export async function handleDeleteAccount(req: Request, deps: DeleteDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const who = await deps.authenticate(req);
  if (!who) return json(401, { error: "unauthorized" });
  const body = z.object({ confirm: z.literal("ELIMINA") }).strict().safeParse(await readJson(req));
  if (!body.success) return json(400, { error: "confirmation_required" });
  try { await deps.audit("account_deleted", who.userId); await deps.deleteUser(who.userId); }
  catch { return json(500, { error: "delete_failed" }); }
  return json(200, { deleted: true });
}
export { resolvePlan };
