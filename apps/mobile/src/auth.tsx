import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthCtx {
  session: Session | null; loading: boolean;
  signUp(email: string, password: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<string | null>;
  resetPassword(email: string): Promise<string | null>;
  signOut(): Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);
const friendly = (m?: string) => (m ? "Operazione non riuscita. Controlla i dati e riprova." : null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(!!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const api: AuthCtx = {
    session, loading,
    signUp: async (email, password) => { if (!supabase) return "Backend non configurato."; const { error } = await supabase.auth.signUp({ email, password }); return friendly(error?.message); },
    signIn: async (email, password) => { if (!supabase) return "Backend non configurato."; const { error } = await supabase.auth.signInWithPassword({ email, password }); return friendly(error?.message); },
    resetPassword: async (email) => { if (!supabase) return "Backend non configurato."; const { error } = await supabase.auth.resetPasswordForEmail(email); return friendly(error?.message); },
    signOut: async () => { await supabase?.auth.signOut(); },
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error("AuthProvider mancante"); return c; };
