# Stato reale dei connettori (aggiornato 2026-11-18)

`claude mcp list` locale: **nessun server configurato**. I connettori sotto sono quelli esposti dalla sessione cloud.

| Connettore | Stato | Uso effettivo in questa sessione | Note |
|---|---|---|---|
| GitHub | Disponibile, limitato al repo `lumevoradigitalstudio-ctrl/studiotecnicocommercialeparadiso` | Versionamento via git sul branch `ccr-87348f8d-uziqaj` | Il repo preesistente (non dedicato solo a RITMO) è stato riusato: nessun repo nuovo creato senza autorizzazione. Nessuna PR creata. |
| Supabase | Disponibile, **ma l'unico progetto visibile è «ARVEN Auth - Collaudo»**, non di RITMO | **Non usato.** Tentata creazione del progetto «RITMO AI - Sviluppo» (free, eu-central-1): negata dal sistema di permessi. Schema/RLS testati su PostgreSQL 16 locale | Serve la tua decisione: creare un progetto RITMO di sviluppo (può avere costi) o autorizzare un progetto esistente. Non ho toccato ARVEN. |
| Figma | Disponibile | Non usato | Design system definito in codice (`apps/mobile/src/theme.ts`); da portare in Figma. |
| Context7 | Disponibile | Caricato ma **non interrogato**: le versioni compatibili Expo sono state lette da `expo/bundledNativeModules.json` | Da usare prima di integrare RevenueCat/Sentry/provider AI. |
| Playwright | MCP non configurato; usato il pacchetto Playwright preinstallato | Test E2E web (`tests/e2e/mvp.mjs`) | Non copre i flussi nativi Android/iOS. |
| Sentry | **Non configurato** | — | Da integrare dopo verifica privacy (no chat/dati sanitari nei log). |
| RevenueCat | **Non configurato** | Paywall solo informativo | Richiede account, build native, sandbox. |

Rete: `api.expo.dev` è bloccato dal proxy → `expo install` non funziona qui; versioni scelte da `bundledNativeModules.json`.
