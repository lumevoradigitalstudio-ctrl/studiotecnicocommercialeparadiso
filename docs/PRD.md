# PRD — RITMO AI (MVP tecnico v0.1)
## Obiettivo MVP
Dimostrare che l'utente ottiene una risposta utile in <1 minuto dal primo avvio, e ritrova i dati alla riapertura.
## Percorso principale (stato)
| # | Passo | Stato |
|---|---|---|
| 1 | Registrazione/login/recupero password | ◐ **codice scritto, mai provato con un utente reale** (Supabase Auth, schermata `login`). Senza variabili d'ambiente l'app resta in modalità locale. |
| 2-3 | Onboarding + preferenze (con consenso esplicito) | ✔ locale |
| 4 | Home | ✔ |
| 5-7 | Chat → legge dispensa via tool → ricetta | ✔ **DEMO provider** (nessun LLM reale) |
| 8-9 | Conferma e salvataggio pasto | ✔ registrazione manuale; salvataggio da chat via tool pronto (richiede conferma) ma UI di conferma non ancora cablata |
| 10 | Persistenza dopo riapertura | ✔ verificata (E2E web, AsyncStorage/localStorage) |
## Fuori MVP (backlog ordinato)
P1 verifica end-to-end con utente reale (conferma email, isolamento) · P1 eliminazione account server-side (Edge Function con service_role) · P1 Edge Function provider AI reale + `consume_ai_quota` · P1 UI conferma scritture · P2 DB alimentare (OFF/USDA/CREA) e nutrienti delle ricette · P2 ricettario esteso e revisionato · P3 RevenueCat · P3 admin dashboard · P3 notifiche · P3 barcode/foto/voce.
## Requisiti non funzionali
Accessibilità (label, ruoli, target ≥44px, font scalabili) · privacy by design · nessun segreto nel client · limiti AI server-side.

## Aggiornamento
Implementati (locale, testati in E2E): ricette dalla dispensa con porzioni modificabili, lista della spesa («Da comprare»), «Il mio percorso» (giorni con almeno un pasto, senza serie né colpa). Tool AI `search_recipes` e `create_shopping_list` (66 test). Non persistita: la lista della spesa è calcolata al volo, non salvata (tabella `shopping_lists` pronta, nessuna UI di salvataggio).
