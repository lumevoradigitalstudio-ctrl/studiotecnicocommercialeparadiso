# Blocchi al rilascio (tutti aperti)
- [ ] Verifica marchio/domini/store per «RITMO AI» · [ ] Revisione dietista/nutrizionista · [ ] Revisione legale/privacy/DPIA · [ ] Auth e DB reali in ambiente RITMO · [ ] LLM reale + test costi · [ ] RevenueCat sandbox + build native · [ ] Test su dispositivi Android/iOS reali · [ ] Sentry senza PII · [ ] Asset e schede store · [ ] Supporto/contatti · [ ] Valutazione dispositivo medico · [ ] Autorizzazione tua alla pubblicazione.

## Stato aggiornato
- [x] Test automatici riproducibili (`npm run test:all`) · [x] audit accessibilità automatico · [x] scrubbing privacy pronto
- [x] Migrazione 0003 applicata al progetto reale · [ ] Rieseguire advisor di sicurezza · [ ] Deploy funzioni (`ritmo-chat`, `delete-account`, `admin-metrics` con JWT; `revenuecat-webhook`, `waitlist` con `--no-verify-jwt`) e segreti · [ ] Creare il primo admin (INSERT in `admin_users` da SQL) e abilitare MFA
- [ ] Tutti gli altri blocchi sopra restano aperti. Vedi `docs/readiness.md`.
- [x] Configurazione hosting web preparata (`_headers` con CSP verificata, `_redirects`, `netlify.toml`) · [ ] Deploy effettivo su una piattaforma (richiede tua conferma) · [ ] Dominio e verifica marchio
- [ ] **Revisione professionale dell'area «Obiettivo peso»** (soglie, formule, testi) e valutazione dispositivo medico; finché non fatta, build pubbliche con `EXPO_PUBLIC_WEIGHT_AREA=off`
