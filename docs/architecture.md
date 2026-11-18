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
6. **Provider AI scelto: Anthropic (Claude Haiku 5.5, `claude-haiku-5-5`)** dietro `LLMProvider`. Motivi: tool calling affidabile, costo per messaggio contenuto, API semplice. Sostituibile implementando l'interfaccia. **Non ancora provato con chiamate reali** (adapter testato solo con `fetch` simulato). Il prezzo €/Mtoken NON è nel codice: va letto dal listino ufficiale e passato in configurazione al deploy. Nessun confronto formale con altri provider (R-2).
7. **Supabase**: decisione presa = nuovo progetto dedicato «RITMO AI - Sviluppo», regione `eu-central-1`, piano free (costo €0: l'org è free con 1 solo progetto). Creato dopo autorizzazione esplicita: ref `euxcajovjuzbdjxdckbe`. Solo chiave publishable nel client (`.env.example`).
8. **Ricette** (`packages/core/src/recipes.ts`): 9 bozze di preparazioni tradizionali redatte da RITMO, **senza valori nutrizionali** (da calcolare con un DB alimentare di licenza verificata) e **da far revisionare**. Abbinamento dispensa→ricetta deterministico (normalizzazione singolare/plurale, condimenti base esclusi dalla copertura), nessun suggerimento se non c'è corrispondenza. Decisione di sicurezza: **nessun tag «senza glutine/lattosio»** (celiachia e intolleranze sono ambito sanitario; contaminazione): solo filtro vegetariano derivato dagli ingredienti e alimenti esclusi dall'utente. Il matching per sottostringa è euristico (possibili falsi positivi, es. ingredienti dal nome simile).
