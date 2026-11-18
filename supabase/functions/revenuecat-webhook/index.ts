// Webhook RevenueCat → subscription_entitlements. Deploy con `--no-verify-jwt` (RevenueCat non invia JWT Supabase):
// l'autenticazione è il segreto condiviso nell'header Authorization configurato nella dashboard RevenueCat.
// Segreti: REVENUECAT_WEBHOOK_SECRET (obbligatorio), RC_ENTITLEMENT_ID (default "plus"), RC_ALLOW_SANDBOX ("1" solo in sviluppo).
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleRevenueCatWebhook } from "../../../packages/core/src/ops.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

Deno.serve((req: Request) => handleRevenueCatWebhook(req, {
  webhookSecret: env("REVENUECAT_WEBHOOK_SECRET"), allowSandbox: env("RC_ALLOW_SANDBOX") === "1", entitlement: env("RC_ENTITLEMENT_ID") || "plus",
  apply: async (e) => {
    const { data, error } = await admin.rpc("apply_billing_event", { p_event_id: e.eventId, p_user: e.userId, p_type: e.type, p_env: e.env, p_event_ts: e.eventTs, p_active: e.active, p_expires: e.expiresAt });
    if (error) throw error; return data as "applied" | "duplicate" | "stale" | "unknown_user";
  },
}));
