# Architettura
Monorepo npm workspaces.
- `packages/core` — schemi zod, limiti piani, `resolvePlan`.
- `packages/nutrition` — calcoli deterministici (scala porzioni, Atwater, stime con intervallo). L'LLM non produce quantità.
- `packages/ai` — `LLMProvider` (interfaccia), `DemoProvider`, safety (rischi, injection, validazione output), tool server-side con identità da contesto, quota/budget, orchestratore (max 4 step).
- `apps/mobile` — Expo SDK 58, Expo Router, store locale (AsyncStorage).
- `supabase/migrations` — schema + RLS + `consume_ai_quota` atomica (advisory lock per utente).
- `tests/db` (Postgres reale) · `tests/e2e` (Playwright su export web).
## Flusso AI previsto in produzione
App → Edge Function (JWT utente) → `consume_ai_quota` → `runAgent` con `DataAccess` basato su client Supabase **col JWT utente** (RLS) → `finish_ai_request`. Il provider vive solo server-side. Oggi `runAgent` gira **nel client** con DemoProvider: accettabile solo per demo.
## Decisioni (ADR sintetici)
1. Piano derivato dal DB (entitlement via webhook RevenueCat), mai dal client.
2. Quote nel DB con lock per utente, non in memoria (`InMemoryQuota` è solo riferimento/test).
3. Metro: zod installato anche in `apps/mobile` (la risoluzione dal root falliva).
4. Versioni Expo da `bundledNativeModules.json` (api.expo.dev bloccato).
5. Limite Plus 40/giorno-500/mese: con 1.200/mese il worst-case AI eguagliava il ricavo netto.
