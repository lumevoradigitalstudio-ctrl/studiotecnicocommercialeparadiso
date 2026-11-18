# Pubblicazione online (preparata, NON eseguita)
Nulla è stato pubblicato. Questi file rendono la pubblicazione ripetibile; il deploy richiede il TUO account e la TUA conferma.

## Tre siti statici
| Sito | Cartella | Build | Note |
|---|---|---|---|
| App web (demo) | `apps/mobile` → `dist` | `bash scripts/build-web.sh` (o `netlify.toml`) | `public/_headers`, `_redirects`, `robots.txt` finiscono in `dist` |
| Landing | `apps/landing` | nessuna | imposta `WAITLIST_URL` in `config.js` dopo il deploy della funzione `waitlist` |
| Admin | `apps/admin` | nessuna | `noindex`, `no-store`; **non pubblicare finché non ci sono login admin, MFA e funzione `admin-metrics` deployata** |
`_headers`/`_redirects` sono compatibili con **Netlify** e **Cloudflare Pages** (non testato su queste piattaforme). Percorso consigliato: Cloudflare Pages o Netlify, import del repository, build command e directory come in tabella.

## Cosa è verificato / non verificato
✔ App, landing e admin funzionano **sotto la CSP** di `_headers` (nessuna violazione; E2E 15/15 + app) · ✔ fallback SPA gestito da `_redirects` · ✔ build riproducibile.
✖ Mai pubblicato su una piattaforma reale · ✖ HSTS/TLS dipendono dalla piattaforma · ✖ nessun dominio configurato.

## Due modalità dell'app web
1. **DEMO locale (default, consigliata per un link condivisibile ora):** nessuna variabile. Assistente DEMO, dati solo nel browser di chi la apre, nessun backend.
2. **Con backend:** imposta nelle variabili di build `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (pubbliche, in `apps/mobile/.env.example`). Prima devono essere deployate le funzioni e provata la registrazione; oggi l'assistente risponderebbe «non disponibile».

## Prima di rendere pubblico un link
- Il sito è `noindex`, ma chiunque abbia il link la apre: tienilo non diffuso o dietro accesso (es. Cloudflare Access gratuito fino a 50 utenti — da verificare sul piano corrente).
- Nome «RITMO AI» provvisorio: verifica marchio e dominio prima di un dominio pubblico.
- L'informativa della landing è una bozza non valida legalmente: non raccogliere email reali finché non è sostituita e la funzione `waitlist` non ha double opt-in e rate limit.
- Nessuna pubblicità, nessuna promessa sanitaria; avviso «non è un servizio medico» già presente.
- Costi: i piani gratuiti delle piattaforme bastano per siti statici; verifica i limiti correnti prima di attivare qualsiasi piano a pagamento.
