# Sicurezza — stato
Verificato da test (`tests/db/rls.test.ts`, PostgreSQL 16 locale): isolamento righe tra utenti (select/update/delete/insert), anon bloccato, impossibile auto-assegnarsi Plus, impossibile chiamare `consume_ai_quota`/scrivere il ledger, quota atomica sotto 20 richieste concorrenti, scadenza Plus → free, budget globale, cascade su eliminazione utente.
Verificato da test AI (`packages/ai/src/ai.test.ts`): tool, conferme, injection, output ostile, quote, concorrenza, budget.
**Non verificato:** RLS su Supabase reale (stub `auth.uid()` locale), advisor Supabase, JWT/sessioni, rate limiting HTTP, audit log scritto da codice, scansione segreti, nessun pen-test. `audit_events` è solo tabella.
Regole: nessuna chiave `service_role` nel client; `.env*` ignorati; solo chiave publishable lato app.

## Debiti aperti (2026-11-18)
- **Isolamento RLS sul progetto Supabase reale NON verificato**: due tentativi di eseguire il test transazionale (con rollback) via MCP sono scaduti in attesa di una conferma interattiva. La verifica di riferimento resta `tests/db/rls.test.ts` su Postgres locale + controllo dei privilegi via `has_*_privilege` sul progetto reale (eseguito: ok). Da ripetere appena possibile.
- Auth, conferma email, recupero password: codice presente, non testato con utente reale (la registrazione invia email vere: farlo con un indirizzo di tua proprietà).
- Eliminazione account: funzione `delete-account` scritta e testata a livello di handler, **non deployata né provata end-to-end**.
- Impostazioni Auth del progetto (conferma email obbligatoria, lunghezza password, rate limit, protezione password trapelate) non ancora riviste.

## Aggiunte (migrazione 0003, funzioni operative)
Verificato su Postgres locale: `apply_billing_event` idempotente/anti-stale, `admin_metrics` solo aggregati e non eseguibile da utenti/anon, tabelle `billing_events`/`admin_users`/`waitlist` inaccessibili ai client, email unica case-insensitive. Handler: webhook (401 senza segreto, confronto costante), admin (401/403, **audit prima dei dati**, fail-closed), CORS a lista esplicita, honeypot e risposta uniforme sui duplicati. Dashboard admin: token solo in memoria, nessuna email/testo nelle metriche. Accessibilità: axe-core WCAG 2.1 AA senza violazioni su 11 schermate (non sostituisce test con screen reader su dispositivi reali).
**Aperti:** ruoli admin assegnati a mano (nessuna UI), `viewer` e `owner` oggi hanno gli stessi permessi (solo metriche), nessun MFA obbligatorio per admin (da abilitare su Supabase Auth), segreti non ancora impostati.
