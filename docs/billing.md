# Abbonamenti e fatturazione — stato
## Implementato (server, testato su Postgres locale e con handler simulati)
- `revenuecat-webhook` (Edge Function, `--no-verify-jwt`): autenticazione con segreto condiviso (confronto a tempo costante), validazione payload, ignora sandbox (salvo `RC_ALLOW_SANDBOX=1`), utenti anonimi, tipi non gestiti (BILLING_ISSUE, TEST, TRANSFER) ed entitlement diversi da `plus`.
- `apply_billing_event` (SQL): idempotente per `event_id`, scarta eventi più vecchi dello stato (out-of-order), utente inesistente rifiutato; scrive `subscription_entitlements`. Il piano usato dalle quote (`consume_ai_quota`) deriva solo da qui.
- Regola di stato: dalla **scadenza** dichiarata nell'evento (disdetta = accesso fino a scadenza; `EXPIRATION` = free).
- Il formato dell'evento è quello della documentazione RevenueCat **non verificato su payload reali**.
## NON implementato (richiede account/azioni tue)
1. Account RevenueCat, app iOS/Android, prodotti (mensile €9,90 / annuale €69 — ipotesi), entitlement `plus`, webhook verso `…/functions/v1/revenuecat-webhook` con header `Authorization` = segreto.
2. SDK `react-native-purchases` nell'app (richiede **build native**: non funziona in Expo Go/web), `Purchases.logIn(<uuid utente Supabase>)`, paywall reale, «Ripristina acquisti». Oggi la schermata Premium è solo informativa e disabilita l'acquisto.
3. Account sviluppatore Apple/Google, prodotti in-app, utenti sandbox; test di rinnovo/scadenza/revoca/rimborso reali.
4. Verifica regole Apple/Google sugli acquisti digitali e commissioni effettive (assunzione 15% **non verificata**).
5. Calcolo dei ricavi nella dashboard (oggi «non disponibili»).
## Sicurezza
Il client non può modificare entitlement (test RLS). Il webhook è l'unico scrittore, oltre a `service_role`.
