# RITMO AI
Assistente di alimentazione per la vita reale (Italia). **Stato: prototipo tecnico, non pronto alla vendita.** Auth/DB cloud e LLM reale non collegati; l'assistente è in modalità DEMO.

## Avvio
```bash
npm install
npm test                         # 40 test: core, nutrition, ai, RLS su Postgres 16 locale (saltati se manca)
npm run typecheck
cd apps/mobile && npm install --legacy-peer-deps && npx expo start
# E2E web:  npx expo export --platform web && node ../../tests/e2e/serve.mjs dist 8099 & node ../../tests/e2e/mvp.mjs
node scripts/cost-model.mjs
```
Documentazione in `docs/` (iniziare da `connectors-status.md`, `PRD.md`, `roadmap.md`).
