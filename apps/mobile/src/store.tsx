import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserPreferences, MealEntryInput, PantryItem } from "@ritmo/core";
import type { z } from "zod";

export interface ChatLine { role: "user" | "assistant"; text: string; demo?: boolean }
export interface MealRow extends z.infer<typeof MealEntryInput> { id: string }
export interface AppState {
  onboarded: boolean; prefs: z.infer<typeof UserPreferences> | null;
  pantry: z.infer<typeof PantryItem>[]; meals: MealRow[]; chat: ChatLine[]; consentHealth: boolean;
}
const EMPTY: AppState = { onboarded: false, prefs: null, pantry: [], meals: [], chat: [], consentHealth: false };
const KEY = "ritmo.state.v1";

/** Persistenza locale (AsyncStorage). Con un progetto Supabase RITMO verrà sostituita da un repository con RLS. */
const Ctx = createContext<{ state: AppState; ready: boolean; update: (fn: (s: AppState) => AppState) => void; reset: () => Promise<void> } | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY); const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v) { try { setState({ ...EMPTY, ...JSON.parse(v) }); } catch { /* dati corrotti: riparte da zero */ } } setReady(true); }); }, []);
  const update = useCallback((fn: (s: AppState) => AppState) => setState(prev => { const next = fn(prev); AsyncStorage.setItem(KEY, JSON.stringify(next)); return next; }), []);
  const reset = useCallback(async () => { await AsyncStorage.removeItem(KEY); setState(EMPTY); }, []);
  return <Ctx.Provider value={{ state, ready, update, reset }}>{children}</Ctx.Provider>;
}
export const useStore = () => { const c = useContext(Ctx); if (!c) throw new Error("StoreProvider mancante"); return c; };
