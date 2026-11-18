// Edge Function «delete-account»: elimina l'utente del token (cascade su tutti i dati). Richiede body {"confirm":"ELIMINA"}.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleDeleteAccount } from "../../../packages/ai/src/index.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

Deno.serve((req: Request) => handleDeleteAccount(req, {
  authenticate: async (r) => {
    const token = r.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { userId: data.user.id };
  },
  audit: async (action, userId) => { await admin.from("audit_events").insert({ actor: userId, action, subject: userId }); },
  deleteUser: async (userId) => { const { error } = await admin.auth.admin.deleteUser(userId); if (error) throw error; },
}));
