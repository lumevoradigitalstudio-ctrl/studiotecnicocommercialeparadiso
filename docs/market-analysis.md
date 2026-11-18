# Analisi di mercato — RITMO AI (bozza v0)

**Metodo e limiti.** Prezzi: ricerca web del 2026-11-18, senza accesso alle pagine ufficiali dei prezzi italiani (spesso solo store/aggregatori). Non ho testato i prodotti, non ho dati su fatturato/abbonati/retention (e non li invento). Le sezioni qualitative sono **ipotesi da validare** con recensioni store reali e prove d'uso: backlog task R-1.

## Prezzi rilevati (non confermati su listino ufficiale italiano)
| Prodotto | Dato rilevato | Fonte | Affidabilità |
|---|---|---|---|
| MyFitnessPal Premium | US $19.99/mese, $79.99/anno; prova 7 gg; prezzo IT non trovato | [nutriscan](https://nutriscan.app/it/blog/posts/myfitnesspal-pricing-2026-guide-2ff09c399a), [pagina IT](https://www.myfitnesspal.com/it/premium) | Bassa (terze parti, USD) |
| YAZIO Pro | ~€6,99/mese, €29,99/anno (indicativi) | [nutrola.app](https://nutrola.app/it/blog/yazio-review-2026) (app concorrente), [T&C](https://www.yazio.com/it/terms) | Bassa |
| Lifesum Premium | Fonti discordanti: $44,99–$99,96/anno; listino App Store apr. 2026 con più piani | [App Store](https://apps.apple.com/us/app/-/id286906691), [apppricinglab](https://www.apppricinglab.com/iap/apple/286906691) | Molto bassa |
| Noom | Weight: ~$59–70/mese secondo terze parti; Noom Med (GLP-1) da $79–199/mese, pagine ufficiali discordanti | [noom.com/plans](https://www.noom.com/plans) | Media/bassa |
| MacroFactor | $11.99/mese, $47.99/6 mesi, $71.99/anno (USD) | [help ufficiale](https://help.macrofactorapp.com/en/articles/393-how-macrofactor-subscriptions-and-bundles-work) | **Alta** |
| Melarossa | Dieta personalizzata €2,99/mese dopo prova (sito/store) | [melarossa.it](https://www.melarossa.it/?p=288543) | Media |

Implicazione: il benchmark italiano tipico è **molto più basso di €9,90/mese** (Melarossa €2,99; YAZIO ~€7/mese). L'ipotesi €9,90/€69 va giustificata dal valore dell'agente (non dal tracking), altrimenti rischia una conversione bassa → test di prezzo in beta (Van Westendorp / A/B su paywall).

## Osservazioni strategiche (ipotesi)
- Il segmento è dominato da tracker calorie + piani; la differenziazione nel *momento della decisione* (fame fuori orario, turni, dispensa) non risulta presidiata in modo evidente dai sei concorrenti, **ma non l'ho verificato funzione per funzione**: serve audit manuale (R-1).
- Rischi: concorrenti con AI già in app (es. YAZIO/Lifesum promuovono funzioni AI negli store); costi AI per messaggio; normativa dati salute.
- Direzione confermata come ipotesi: «agente per la vita reale» su utenti con orari irregolari; da validare con 15–20 interviste prima di investire in marketing.

## Da fare (R-1)
Leggere 30+ recensioni store per concorrente (IT), registrare cause di abbandono ricorrenti; confermare prezzi IT dagli store; verificare licenze dati (Open Food Facts ODbL, USDA CC0/public domain, CREA: condizioni d'uso da leggere).
