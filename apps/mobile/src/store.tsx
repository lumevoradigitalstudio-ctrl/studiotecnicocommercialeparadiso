import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserPreferences, MealEntryInput, PantryItem } from "@ritmo/core";
import type { z } from "zod";
import { useAuth } from "./auth";
import { remoteEnabled } from "./supabase";
import * as remote from "./remote";
import type { BodyProfile, Screening, WeightEntry } from "@ritmo/nutrition";

export interface ChatLine { role: "user" | "assistant"; text: string; demo?: boolean }
export interface MealRow extends z.infer<typeof MealEntryInput> { id: string }
export interface WeightState { consent: boolean; body: BodyProfile | null; screening: Screening | null; shift: { start: number; end: number } | null; entries: (WeightEntry & { id?: string })[] }
const EMPTY_WEIGHT: WeightState = { consent: false, body: null, screening: null, shift: null, entries: [] };
export interface AppState {
  weight: WeightState;
  onboarded: boolean; prefs: z.infer<typeof UserPreferences> | null;
  pantry: (z.infer<typeof PantryItem> & { id?: string })[]; meals: MealRow[]; chat: ChatLine[]; consentHealth: boolean;
}
const EMPTY: AppState = { weight: EMPTY_WEIGHT, onboarded: false, prefs: null, pantry: [], meals: [], chat: [], consentHealth: false };
const KEY = "ritmo.state.v1";

/** Persistenza locale (AsyncStorage). Con un progetto Supabase RITMO verrà sostituita da un repository con RLS. */
export interface Actions {
  finishOnboarding(prefs: z.infer<typeof UserPreferences>): Promise<void>;
  addMeal(m: Omit<MealRow, "id">): Promise<void>;
  addPantry(p: z.infer<typeof PantryItem>): Promise<void>;
  removePantry(index: number): Promise<void>;
  wipeData(): Promise<void>;
  setWeightConsent(on: boolean): Promise<void>;
  saveWeightProfile(body: BodyProfile, screening: Screening, shift: { start: number; end: number } | null): Promise<void>;
  addWeight(kg: number): Promise<void>;
  removeWeight(index: number): Promise<void>;
  revokeWeightData(): Promise<void>;
  deleteAccount(): Promise<boolean>;
}
const Ctx = createContext<{ state: AppState; ready: boolean; error: string | null; update: (fn: (s: AppState) => AppState) => void; reset: () => Promise<void>; actions: Actions } | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth(); const uid = session?.user.id ?? null;
  const [state, setState] = useState<AppState>(EMPTY); const [ready, setReady] = useState(false); const [error, setError] = useState<string | null>(null);
  // Modalità remota: i dati vivono nel DB (RLS). La cache locale serve solo in modalità demo.
  const persistLocal = !remoteEnabled;
  useEffect(() => {
    if (loading) return;
    setReady(false); setError(null);
    if (remoteEnabled) {
      if (!uid) { setState(EMPTY); setReady(true); return; }
      remote.loadAll(uid).then(d => setState(s => ({ ...EMPTY, chat: s.chat, ...d }))).catch(() => setError("Impossibile caricare i dati. Riprova.")).finally(() => setReady(true));
    } else {
      AsyncStorage.getItem(KEY).then(v => { if (v) { try { setState({ ...EMPTY, ...JSON.parse(v), weight: { ...EMPTY_WEIGHT, ...(JSON.parse(v).weight ?? {}) } }); } catch { /* dati corrotti */ } } setReady(true); });
    }
  }, [uid, loading]);
  const update = useCallback((fn: (s: AppState) => AppState) => setState(prev => { const next = fn(prev); if (persistLocal) AsyncStorage.setItem(KEY, JSON.stringify(next)); return next; }), [persistLocal]);
  const reset = useCallback(async () => { if (persistLocal) await AsyncStorage.removeItem(KEY); setState(EMPTY); }, [persistLocal]);
  const guard = async (fn: () => Promise<void>) => { try { setError(null); await fn(); } catch { setError("Operazione non riuscita. Riprova."); } };
  const actions: Actions = {
    finishOnboarding: (prefs) => guard(async () => { if (uid) await remote.saveOnboarding(uid, prefs); update(s => ({ ...s, prefs, onboarded: true, consentHealth: true })); }),
    addMeal: (m) => guard(async () => { const id = uid ? await remote.insertMeal(uid, m) : String(Date.now()); update(s => ({ ...s, meals: [{ ...m, id }, ...s.meals] })); }),
    addPantry: (p) => guard(async () => { const id = uid ? await remote.insertPantry(uid, p) : undefined; update(s => ({ ...s, pantry: [...s.pantry, { ...p, id }] })); }),
    removePantry: (i) => guard(async () => { const id = state.pantry[i]?.id; if (uid && id) await remote.deletePantry(id); update(s => ({ ...s, pantry: s.pantry.filter((_, j) => j !== i) })); }),
    deleteAccount: async () => { try { setError(null); await remote.deleteAccount(); await reset(); return true; } catch { setError("Eliminazione non riuscita. Riprova o contatta il supporto."); return false; } },
    setWeightConsent: (on) => guard(async () => { if (uid && on) await remote.grantWeightConsent(uid, true); update(s => ({ ...s, weight: { ...s.weight, consent: on } })); }),
    saveWeightProfile: (body, screening, shift) => guard(async () => { if (uid) await remote.saveBodyProfile(uid, { body, screening, shift }); update(s => ({ ...s, weight: { ...s.weight, body, screening, shift } })); }),
    addWeight: (kg) => guard(async () => { const date = new Date().toISOString().slice(0, 10); const id = uid ? await remote.insertWeight(uid, kg, date) : undefined; update(s => ({ ...s, weight: { ...s.weight, entries: [...s.weight.entries.filter(e => e.date !== date), { date, kg, id }] } })); }),
    removeWeight: (i) => guard(async () => { const e = state.weight.entries[i]; if (uid && e?.id) await remote.deleteProgress(e.id); update(s => ({ ...s, weight: { ...s.weight, entries: s.weight.entries.filter((_, j) => j !== i) } })); }),
    revokeWeightData: () => guard(async () => { if (uid) await remote.revokeWeightData(uid); update(s => ({ ...s, weight: EMPTY_WEIGHT })); }),
    wipeData: () => guard(async () => { if (uid) await remote.deleteAllMyData(uid); await reset(); }),
  };
  return <Ctx.Provider value={{ state, ready, error, update, reset, actions }}>{children}</Ctx.Provider>;
}
export const useStore = () => { const c = useContext(Ctx); if (!c) throw new Error("StoreProvider mancante"); return c; };
