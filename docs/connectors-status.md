# Stato reale dei connettori (aggiornato 2026-11-18)

`claude mcp list` locale: **nessun server configurato**. I connettori sotto sono quelli esposti dalla sessione cloud.

| Connettore | Stato | Uso effettivo in questa sessione | Note |
|---|---|---|---|
| GitHub | Disponibile, limitato al repo `lumevoradigitalstudio-ctrl/studiotecnicocommercialeparadiso` | Versionamento via git sul branch `ccr-87348f8d-uziqaj` | Il repo preesistente (non dedicato solo a RITMO) è stato riusato: nessun repo nuovo creato senza autorizzazione. Nessuna PR creata. |
| Supabase | Disponibile, **ma l'unico progetto visibile è «ARVEN Auth - Collaudo»**, non di RITMO | **Non usato.** Progetto **«RITMO AI - Sviluppo»** creato (ref `euxcajovjuzbdjxdckbe`, eu-central-1, piano free, autorizzato dall'utente). Migrazioni 0001+0002 applicate; verificati via SQL privilegi e RLS; advisor sicurezza: solo INFO atteso su `audit_events`. Auth/dati NON ancora collegati all'app | Serve la tua decisione: creare un progetto RITMO di sviluppo (può avere costi) o autorizzare un progetto esistente. Non ho toccato ARVEN. |
| Figma | Disponibile | Non usato | Design system definito in codice (`apps/mobile/src/theme.ts`); da portare in Figma. |
| Context7 | Disponibile | Caricato ma **non interrogato**: le versioni compatibili Expo sono state lette da `expo/bundledNativeModules.json` | Da usare prima di integrare RevenueCat/Sentry/provider AI. |
| Playwright | MCP non configurato; usato il pacchetto Playwright preinstallato | Test E2E web (`tests/e2e/mvp.mjs`) | Non copre i flussi nativi Android/iOS. |
| Sentry | **SDK non installato** | Pronto `scrubEvent` (rimuove chat/email/token/uuid, testato) da usare in `beforeSend` | Servono account e DSN; `sendDefaultPii:false`. |
| RevenueCat | **Non configurato** | Lato server pronto (webhook→entitlement, testato su payload simulati) | Vedi `docs/billing.md`. |

Rete: `api.expo.dev` è bloccato dal proxy → `expo install` non funziona qui; versioni scelte da `bundledNativeModules.json`.

Rete (2026-11-18): `world.openfoodfacts.org`, `api.nal.usda.gov`, `www.crea.gov.it` → 403 dal proxy. Proposta di un ambiente dedicato con questi due host: negata dall'utente; non ripetuta.

Migrazione `20261118000003` **applicata** al progetto reale e verificata via SQL (22 tabelle, tutte con RLS; `authenticated`/`anon` senza accesso a `billing_events`, `admin_users`, `waitlist` né a `admin_metrics`/`apply_billing_event`; `service_role` sì). Advisor di sicurezza non rieseguiti dopo la 0003 (la chiamata non ha risposto).

## Funzioni Edge sul progetto reale (2026-11-18)
`delete-account` e `ritmo-chat` **deployate** via Supabase MCP (v1, ACTIVE, verify_jwt attivo). Bundle "slim" (`scripts/build-functions-slim.mjs`; `delete-account` ridotto a mano al solo codice usato). **Non provate dal vivo**: da questa sessione l'host supabase.co è bloccato, quindi non ho potuto chiamarle. Non deployate: `admin-metrics`, `revenuecat-webhook`, `waitlist`.
**Segreti: NON impostati** (il tentativo con `create_edge_function_secret` è stato negato dal sistema di permessi: vanno inseriti da te dalla dashboard Supabase → Edge Functions → Secrets):
| Nome | Valore |
|---|---|
| `ANTHROPIC_API_KEY` | la tua chiave (console Anthropic) |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` |
| `PRICE_IN_EUR_PER_MTOK` | `0.10` (indicativo: $0,10/Mtok ≤100k token, fonti terze; verifica sul listino ufficiale) |
| `PRICE_OUT_EUR_PER_MTOK` | `0.50` (idem) |
| `AI_GLOBAL_MONTHLY_BUDGET_EUR` | un tetto mensile tuo, es. `5` |
| `USDA_API_KEY` (facoltativa) | chiave gratuita FoodData Central |
Finché mancano i primi quattro, `ritmo-chat` risponde 503 e l'app mostra «assistente non disponibile».
