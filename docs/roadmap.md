# Roadmap
| Fase | Stato |
|---|---|
| 0 Audit | ✔ (vedi connectors-status) |
| 1 Strategia | ◐ docs v0; ricerca competitor da completare (R-1) |
| 2 Design | ◐ design system in codice; Figma non usato |
| 3 MVP | ◐ percorso locale+DEMO verificato in E2E; auth + persistenza Supabase **scritte ma non provate con utente reale**; LLM reale mancante |
| 4 Diario/dispensa | ◐ diario e dispensa base; DB alimentare, ricettario, lista spesa mancanti |
| 5 Monetizzazione | ◐ schema quote/entitlement testato; RevenueCat/paywall reale mancanti |
| 6 Sicurezza | ◐ RLS testata in locale; revisioni esterne mancanti |
| 7-8 Beta/Lancio | ✖ non iniziate |
Fatto in autonomia: handler server chat/cancellazione account + cablaggio app (non deployati). Prossimo passo prioritario: provare registrazione/login reali con un'email tua, poi Edge Function AI (serve la chiave Anthropic come segreto) ed eliminazione account.
