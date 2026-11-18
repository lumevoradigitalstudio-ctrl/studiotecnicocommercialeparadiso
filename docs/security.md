# Sicurezza — stato
Verificato da test (`tests/db/rls.test.ts`, PostgreSQL 16 locale): isolamento righe tra utenti (select/update/delete/insert), anon bloccato, impossibile auto-assegnarsi Plus, impossibile chiamare `consume_ai_quota`/scrivere il ledger, quota atomica sotto 20 richieste concorrenti, scadenza Plus → free, budget globale, cascade su eliminazione utente.
Verificato da test AI (`packages/ai/src/ai.test.ts`): tool, conferme, injection, output ostile, quote, concorrenza, budget.
**Non verificato:** RLS su Supabase reale (stub `auth.uid()` locale), advisor Supabase, JWT/sessioni, rate limiting HTTP, audit log scritto da codice, scansione segreti, nessun pen-test. `audit_events` è solo tabella.
Regole: nessuna chiave `service_role` nel client; `.env*` ignorati; solo chiave publishable lato app.
