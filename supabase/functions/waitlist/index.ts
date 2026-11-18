// Iscrizione alla lista d'attesa (pubblica → deploy con `--no-verify-jwt`). Config: LANDING_ALLOWED_ORIGINS.
// ATTENZIONE legale: manca il double opt-in via email e un rate limit per IP (vedi docs/compliance.md).
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleWaitlist, withCors } from "../../../packages/core/src/ops.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

Deno.serve(withCors((req: Request) => handleWaitlist(req, {
  insert: async (e) => {
    const { error } = await admin.from("waitlist").insert({ email: e.email, consent_marketing: true, consent_text_version: e.consentVersion, source: e.source });
    if (error) throw Object.assign(new Error("insert"), { duplicate: error.code === "23505" });
  },
}), env("LANDING_ALLOWED_ORIGINS").split(",").map(s => s.trim()).filter(Boolean)));
