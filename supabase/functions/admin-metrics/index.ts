// Metriche aggregate per la dashboard admin. verify_jwt attivo + ruolo in `admin_users` + audit di ogni accesso.
// Segreto/config: ADMIN_ALLOWED_ORIGINS (elenco separato da virgole).
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleAdminMetrics, withCors } from "../../../packages/core/src/ops.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

Deno.serve(withCors((req: Request) => handleAdminMetrics(req, {
  authenticate: async (r) => { const t = r.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); if (!t) return null; const { data, error } = await admin.auth.getUser(t); return error || !data.user ? null : { userId: data.user.id }; },
  getRole: async (uid) => { const { data } = await admin.from("admin_users").select("role").eq("user_id", uid).maybeSingle(); return (data?.role as "viewer" | "owner" | undefined) ?? null; },
  metrics: async (days) => { const { data, error } = await admin.rpc("admin_metrics", { p_days: days }); if (error) throw error; return data; },
  audit: async (action, userId, meta) => { const { error } = await admin.from("audit_events").insert({ actor: userId, action, subject: userId, meta }); if (error) throw error; },
}), env("ADMIN_ALLOWED_ORIGINS").split(",").map(s => s.trim()).filter(Boolean)));
