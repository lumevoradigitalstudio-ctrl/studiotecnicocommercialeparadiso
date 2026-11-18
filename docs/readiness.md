# Stato di prontezza (2026-11-18) — secondo i criteri del prompt
## MVP tecnico
| Criterio | Stato |
|---|---|
| App avviabile, navigazione | ✔ (export web verificato; **non testata su iOS/Android**) |
| Autenticazione reale | ◐ codice scritto, **mai provato con un utente reale** |
| Database reale | ◐ progetto Supabase creato, migrazioni 0001-0003 applicate e verificate sui privilegi |
| Persistenza verificata | ✔ in modalità locale (E2E); ✖ in modalità remota |
| Agente AI | ◐ DEMO verificato; handler server testato; **nessuna chiamata a un LLM reale** |
| Autorizzazioni testate | ✔ su Postgres locale; ✖ non su Supabase reale |
| Gestione errori / test documentati / config riproducibile | ✔ `npm run test:all` |
## Prodotto vendibile (tutto ancora aperto)
Revisione dietista · verifiche legali/privacy/DPIA · pagamenti reali verificati · test su dispositivi · asset store · supporto · valutazione dispositivo medico · verifica marchio/domini · deploy funzioni e segreti · double opt-in lista d'attesa · rate limit per IP · Sentry SDK (lo scrubbing è pronto: `scrubEvent`) · controllo costi con listino reale.
**Conclusione: beta tecnica in costruzione, NON pronta alla commercializzazione.**
