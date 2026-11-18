# RITMO AI
Assistente di alimentazione per la vita reale (Italia). **Stato: prototipo tecnico, non pronto alla vendita.** Auth/DB cloud e LLM reale non collegati; l'assistente è in modalità DEMO.

## Avvio
```bash
npm install
npm test                         # 53 test: core, nutrition, ai, RLS su Postgres 16 locale (saltati se manca)
npm run typecheck
cd apps/mobile && npm install --legacy-peer-deps && npx expo start
# E2E web:  npx expo export --platform web && node ../../tests/e2e/serve.mjs dist 8099 & node ../../tests/e2e/mvp.mjs
node scripts/cost-model.mjs
```
Documentazione in `docs/` (iniziare da `connectors-status.md`, `PRD.md`, `roadmap.md`).

## Edge Function (NON ancora deployate)
```bash
# con Supabase CLI loggata (azione tua):
supabase link --project-ref euxcajovjuzbdjxdckbe
supabase secrets set ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=claude-haiku-5-5 \
  PRICE_IN_EUR_PER_MTOK=<da listino> PRICE_OUT_EUR_PER_MTOK=<da listino> AI_GLOBAL_MONTHLY_BUDGET_EUR=<tetto>
supabase functions deploy ritmo-chat && supabase functions deploy delete-account   # verify_jwt attivo (default)
```
Senza segreti `ritmo-chat` risponde 503 (nessun fallback demo in produzione). `node scripts/build-functions.mjs` verifica che il bundle si risolva.
