# Privacy/GDPR — checklist per revisione legale (NON è consulenza legale)
Dati di abitudini alimentari possono rivelare condizioni di salute → trattarli come categoria particolare (art. 9): base giuridica = consenso esplicito (l'onboarding lo raccoglie per le preferenze; da registrare in `consents` con versione informativa).
- [x] Minimizzazione: nessun peso/altezza richiesto. [x] Esportazione e cancellazione locali. 
- [ ] Informativa e termini (testi legali). [ ] Registro consensi lato server. [ ] DPIA (probabile necessaria). [ ] DPA/trasferimenti extra-UE per provider AI, Supabase (regione eu-central-1 nel progetto ARVEN, da scegliere per RITMO), RevenueCat, Sentry. [ ] Politica di conservazione. [ ] Eliminazione account server-side (cascade già testato in DB). [ ] Verifica qualificazione come dispositivo medico (claim commerciali solo di benessere). [ ] Consenso marketing separato. [ ] Revisione contenuti da dietista/nutrizionista.

- [ ] Revisione professionale delle 9 ricette del catalogo (cotture, sicurezza alimentare, porzioni) e dei testi di sicurezza dell'agente. [ ] Licenza e attribuzione dati nutrizionali prima di mostrare qualsiasi valore (ODbL/Open Food Facts obbliga ad attribuzione e share-alike sul database derivato; USDA FoodData Central è dominio pubblico; CREA: condizioni da leggere — non verificate in questa sessione).

## Fonti dati alimentari — esito verifica licenze (2026-11-18, da ricerca web, NON consulenza legale)
| Fonte | Licenza/condizioni rilevate | Decisione |
|---|---|---|
| Open Food Facts | ODbL; condizioni API: attribuzione + share-alike; database derivati/misti da rilasciare aperti ([FAQ](https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api)); consigliato compilare il modulo d'uso | Uso **solo a query-time**, nessuna copia/fusione in un nostro DB; attribuzione in ogni schermata che mostra i dati (campo `attribution` nei record) |
| USDA FoodData Central | CC0/dominio pubblico secondo fonti **terze** (testo ufficiale non trovato: da confermare su fdc.nal.usda.gov); API gratuita con chiave, 1.000 richieste/ora/IP ([guida](https://fdc.nal.usda.gov/api-guide.html)) | Usabile anche con cache; chiave **solo server** (header `x-api-key`, mai nell'URL) |
| CREA | Condizioni di riuso **non reperite** | **Non utilizzato.** Da contattare CREA-AN per permesso; lacuna: copertura alimenti italiani |
Limiti: USDA è in inglese (traduzione IT→EN minima, ~30 termini); OFF ha qualità eterogenea (scarto automatico dei record incoerenti ±25% sull'energia Atwater).

## Lista d'attesa (implementata, bozza)
Raccoglie email + consenso marketing esplicito + versione del testo (`draft-0`). **Mancano:** double opt-in via email (richiede un mittente email), rate limit per IP, informativa legale reale (la pagina `privacy.html` è una BOZZA), procedura di cancellazione/revoca, registro del trattamento.
