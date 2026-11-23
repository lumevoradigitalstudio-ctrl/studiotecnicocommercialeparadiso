# Guida di stile delle immagini

Vale per tutte le immagini del libro, foto vere e immagini generate con l'IA.

## Regole fisse (dal prompt)
- Luce naturale laterale, morbida, da una finestra a sinistra o a destra. Niente flash, niente luce dall'alto.
- Piano: tavolo di legno scuro e consumato oppure tovaglia di lino grezzo (color carta `#EFDCB6` o bianco sporco).
- Stoviglie: ceramiche artigianali smaltate a mano, terracotta, rame, legno d'ulivo. Posate semplici.
- Toni caldi: ocra, terra, verde oliva `#4D4C22`, rosso pomodoro e peperoncino `#A3281C`, kraft `#C69C6D`.
- **Vietato:** persone riconoscibili (al massimo mani senza anelli né tatuaggi), loghi o etichette di altri marchi, testo nell'immagine, cibo finto o "da stock".

## Inquadrature
| Tipo | Uso | Inquadratura | Formato |
|---|---|---|---|
| Principale | piatto finito, apre la ricetta | 45° o dall'alto, piatto al centro, qualche ingrediente crudo intorno | 4:3 orizzontale |
| Passaggio | 3-6 per ricetta, azioni chiave | dall'alto o 45°, mani che lavorano, sfondo sgombro | 1:1 quadrato |

## Prompt base (inglese, per lo strumento di generazione)
Aggiungere a ogni soggetto:

> natural side light from a window, rustic dark wooden table or raw linen tablecloth, handmade glazed ceramics, warm earthy tones, olive green and chilli red accents, Southern Italian home kitchen, documentary food photography, shallow depth of field, no people's faces, no text, no logos, no brand labels

Per i passaggi: aggiungere `hands only, no rings, step-by-step cooking shot`.

## Trattamento
- Lato lungo 2000 px, JPEG qualità 85, profilo colore sRGB.
- Nessun filtro forte, nessuna vignettatura marcata.
- Ogni immagine IA porta nel libro la didascalia "Immagine illustrativa generata con IA" / "Illustrative image generated with AI".
- Ogni immagine va registrata in `registro.csv` (file, ricetta, origine, strumento, prompt).

## File
`immagini/NN-nome/NN-principale.jpg`, `immagini/NN-nome/NN-passo-1.jpg`, ...
