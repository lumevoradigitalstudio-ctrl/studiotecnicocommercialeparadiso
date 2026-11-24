# STATO del progetto

Ultimo aggiornamento: 2026-11-23

## Fasi
| Fase | Stato |
|---|---|
| 0 — Piano | ✅ indice rivisto (rev. 2: 60 ricette, senza A Putiga, con salumi di casa) |
| 1 — Ricerca e scrittura IT | ✅ 60/60 bozze scritte (12 blocchi). **STOP: revisione dell'utente** prima della Fase 2. Restano 133 voci `[DA VERIFICARE]` |
| 2 — Edizione EN | ✅ 60/60 ricette + apertura del capitolo salumi in `ricette/en/`. Conversioni US aggiunte e controllate da script (0 errori). Struttura: 120/120 OK |
| 3 — Immagini | ✅ 240 immagini IA generate con Higgsfield (238 del piano: 60 principali 2k + 178 passaggi 1k, più le 2 prove della 29). Tutte in `immagini/registro.csv` con link e prompt. **I file non sono nel repository:** il proxy di questa sessione blocca il sito delle immagini. Da scaricare sul proprio computer con `python3 immagini/scarica_immagini.py` |
| 4 — Impaginazione ed esportazione | ✅ `output/Ricettario-Calabrese-A-Putiga-IT.pdf` (148 pagine, 31 MB) e `output/Calabrian-Cookbook-A-Putiga-EN.pdf` (150 pagine, 31 MB), con le 240 immagini e una copertina dedicata. Titoli: "Il libro di cucina della Putìga" / "The Putìga Cookbook". Manca solo il nome dell'autore. EPUB non fatto (facoltativo). Si rifà con `python3 impaginazione/costruisci.py` |
| 5 — Controllo qualità | ✅ 24/11: 0 voci da verificare in IT ed EN (erano 134 + 133); 120/120 ricette con la struttura completa; conversioni US ricalcolate su tutte le 60 ricette (0 errori); 241 immagini presenti e registrate, tutte con dicitura IA; PDF con caratteri incorporati, indice cliccabile, segnalibri, sotto 50 MB; 3 pagine a caso guardate; 2 frasi cercate sul web senza trovare copie. Skill humanizer non usata: fatta una ricerca di espressioni pubblicitarie o da IA (nessuna trovata) |
| 6 — Kit di vendita | 🟡 sito di vendita animato IT/EN in `sito/pubblico/` (da `python3 sito/costruisci_sito.py`, 7,9 MB, niente cookie né servizi esterni): sfondo in movimento, libro 3D, libro da sfogliare, nastri di foto, contatori, vapore, barra di acquisto su telefono, "riduci movimento" rispettato; ricetta omaggio in PDF (fileja, 1,2 MB); piano di test in `sito/test-ab.md`. Non pubblicato. Mancano: piattaforma e link di acquisto, prezzo definitivo, dati del venditore, dominio. video del hero (Higgsfield, 35 crediti, ok dell'utente) in loop avanti-indietro, MP4 1,3 MB + WebM 0,9 MB, spento con "riduci movimento" |

## Ricette completate
Bozze (10/60). Blocco 1 (stile approvato): 05, 09, 29, 50, 59. Blocco 2 (capitolo Salumi completo): apertura del capitolo, 01, 02, 03, 04, 06.
Blocco 3 (conserve): 07, 08, 10, 11, 12.
Blocco 4: 13, 14, 15, 16, 17 (capitolo Conserve completo).
Blocco 5: 18, 19, 20, 21, 22 (capitolo Antipasti completo).
Blocco 6: 23, 24, 25, 26, 27.
Blocco 7: 28 (capitolo Pane completo), 30, 31, 32, 33.
Blocco 8: 34, 35, 36, 37, 38 (capitolo Primi completo).
Blocco 9: 39, 40, 41, 42, 43.
Blocco 10: 44 (capitolo Carne completo), 45, 46, 47, 48.
Blocco 11: 49 (capitolo Pesce completo), 51, 52, 53, 54 (capitolo Contorni completo).
Blocco 12: 55, 56, 57, 58, 60 (capitolo Dolci completo).

Province (prima indicata in ogni ricetta): tutta la regione 28, Cosenza 12, Reggio 7, Vibo 6, Catanzaro 5, Crotone 2. Molte ricette assegnate a una provincia nell'indice sono diventate "tutta la Calabria", perché le fonti non le legano a una zona.
Controllo automatico: `python3 controlli/controlla_ricette.py`.

## Da ricevere dall'utente
- [NOME AUTORE] del titolare.
- Conferma di pubblico e formato (A4 verticale).
- Il marchio A Putiga resta come editore, in copertina e nei colori? ("A Putiga lasciala stare": per ora ho tolto prodotti, box e link)
- Eventuali foto vere in `foto/` (ora è vuota).

## [DA VERIFICARE]
Tutte risolte il 24/11 (Fase 5). Come:
- **Verificate e tenute:** limite nitriti 80 mg/kg (Reg. UE 2023/2108), soglia di pH 5,3, 'nduja senza IGP, nome giuggiulena, oli DOP/IGP, stagione del pesce spada, cicerchia. Fonti in `fonti/capitolo-01-salumi.md` e `fonti/09-melanzane-sottolio.md`.
- **Sostituite con il valore più prudente:** pastorizzazione 20 minuti per i vasetti da 250 ml (08, 09, 14); sott'olio da consumare entro 2 mesi; salsa entro un anno; per i pezzi interi (capocollo, pancetta) 65 mg/kg di nitrito come dose prudente, non come limite di legge.
- **Tenute come scelta della ricetta** (dosi, tempi, durate di conservazione indicative): sale al 2,8% (le guide chiedono almeno il 2,5%), temperature, ammollo dello stocco, quantità d'acqua.
- **Tolte perché non verificabili:** nomi dialettali non confermati (il campo resta "—"), varianti attribuite a zone o famiglie, aneddoti (numero dispari delle uova nella cuzzupa, baccalà alla trappitara, pane dei pescatori), metodi meno sicuri (melanzane all'aceto a freddo, soppressata sott'olio).
- **Zone cambiate:** pitticelle (21) e alici arriganate (48) passano a "tutta la Calabria" e "coste calabresi". Crotone resta con la sola sardella (15).
- Restano senza una fonte specifica, ma con testi senza affermazioni storiche: 21, 28, 35, 44, 48, 52.

## Decisioni prese
- 24/11 (Fase 6): su richiesta dell'utente tolta dal sito la garanzia "se il file non arriva, rimborso" (anche dalle condizioni) e la domanda "Le foto sono vere?". Poi, su richiesta dell'utente, tolta anche la nota "Immagini illustrative generate con IA" dal piè di pagina del sito. Nel libro restano le didascalie IA su ogni immagine, il colophon e la dicitura sulla copertina. Nuova domanda "Le ricette sono originali calabresi?": l'utente proponeva "ricercate con cura nei piccoli borghi di paese", ma non è vero (le fonti sono scritte), quindi la risposta dice come sono state scelte e controllate davvero.
- 24/11 (Fase 6): sito rifatto con le skill landing-page-cro e direct-response-copy. Senza dati di traffico l'analisi è solo un'ipotesi (vedi `sito/test-ab.md`). Prova reale al posto delle recensioni: ricetta omaggio scaricabile senza email; garanzia "file che non si apre: lo sistemiamo o rimborsiamo", coerente con le condizioni. Il video del hero (35 crediti) è stato fatto dopo l'ok esplicito dell'utente ("Ok video"), dal fotogramma del pane (23); registrato in `immagini/registro.csv`. Saldo Higgsfield dopo il video: circa 169 crediti.
- 24/11 (Fase 6): l'utente ha chiesto un sito per vendere il PDF in Italia e nel mondo, superando il "niente siti web" del prompt iniziale. Il sito è solo in locale: niente pubblicazione, account o pagamenti senza il suo ok. Prezzi proposti 12,90 € / $14.99, da confermare. Pagamento previsto tramite una piattaforma che fa da venditore e gestisce IVA/tasse estere. Copertina: la sfumatura ora è dentro l'immagine (il gradiente trasparente lasciava una riga in alcuni lettori PDF).
- 24/11: niente più pagine con due righe. `costruisci.py` impagina, trova le ricette che finiscono con poche righe su una pagina nuova e le compatta (fino a 3 livelli: immagine principale più bassa, note più fitte, poi passaggi illustrati in fondo). IT: 10 ricette compattate, EN: 7, nessuna pagina corta rimasta. Le aperture di capitolo senza testo hanno un'immagine grande di una ricetta del capitolo.
- 24/11 (Fase 5): copertina nuova con un'immagine dedicata (Higgsfield, 2 crediti, nel registro) e titoli "Il libro di cucina della Putìga" / "The Putìga Cookbook", su richiesta dell'utente. Immagine principale delle ricette ridotta a 88 mm e passaggi a 50 mm per evitare pagine quasi vuote (−8 pagine).
- 24/11 (Fase 4): l'utente non era al computer: con il suo ok ho creato l'ambiente "ricettario-calabrese" che sblocca solo d8j0ntlcm91z4.cloudfront.net, e ho scaricato le 240 immagini (0 errori). Nel PDF: principali 1600 px, passaggi 560 px, JPEG 76, per stare a 31 MB.
- 23/11 (Fase 4): installati WeasyPrint 70 e Python-Markdown 3.11 (ok dell'utente). Caratteri EB Garamond e IM Fell English SC scaricati da Google Fonts (OFL) in `impaginazione/font/`.
- 23/11 (Fase 4): il glossario si genera dai nomi dialettali delle ricette, esclusi quelli con [DA VERIFICARE] (24 voci). Si allungherà man mano che i nomi vengono verificati.
- 23/11 (Fase 4): l'indice per ingredienti cerca 34 ingredienti nelle sole liste ingredienti. Controllato: IT ed EN danno le stesse ricette per tutte le 34 voci.
- 23/11 (Fase 4): nel PDF le immagini vengono ridotte (principali 1800 px, passaggi 600 px, JPEG 82) per stare sotto i 50 MB. Gli originali non si toccano.
- 23/11 (Fase 4): la pagina finale è un saluto senza link a aputiga.it, perché l'utente ha chiesto di lasciare stare A Putiga. Il marchio resta come editore in copertina e nel colophon (`EDITORE` in `costruisci.py`), in attesa di conferma.
- 23/11 (Fase 4): le voci [DA VERIFICARE] si vedono nel PDF, evidenziate: vanno risolte prima della versione finale.
- 23/11 (Fase 3): immagini completate. Crediti usati circa 255-260 su 465 (prove 2,75; piano circa 252; fino a circa 4 per un lotto andato in timeout e rifatto, con possibili doppioni non registrati). La principale della 55 è fallita una volta ed è stata rigenerata. Controllo a campione di 4 immagini (05, 29, 41, 57): stile coerente, nessun testo né volto.
- 23/11 (Fase 3): `immagini/scarica_immagini.py` scarica tutte le immagini nelle cartelle `immagini/NN-nome/` e, se c'è Pillow, porta le principali a 2000 px, JPEG 85.
- 23/11 (Fase 3): costi Higgsfield gpt_image_2_6. Immagine 2k high = 2 crediti (2336×1744 px), 2k medium = 1,75, 1k low = 0,75 (1024×1024). 5 immagini a ricetta in 2k high = circa 600 crediti, oltre il saldo (circa 462 dopo le prove). Proposta: principale 2k high + 3 passaggi 1k = 4,25 crediti a ricetta, circa 255 in tutto.
- 23/11 (Fase 2): le misure US non sono scritte a mano. `controlli/converti_misure.py` le aggiunge tra parentesi (oz/lb, cups/tbsp/tsp/quarts, °F, in, teglie A × B) e con `--check` le ricalcola. Le misure sotto i 5 g restano solo metriche.
- 23/11 (Fase 2): EN in inglese internazionale (UK spelling, aubergine/courgette con il nome US tra parentesi nei titoli). Nomi italiani dei piatti mantenuti. Nelle conserve si cita anche l'USDA, nei salumi il Cure #1 americano con la stessa formula.
- 23/11 (Fase 2): corretta un'affermazione storica non verificata sulla 47 ("per secoli" → "a lungo"), in IT ed EN.
- 23/11: la 60 "Pitta 'nchiusa" era un altro nome della pitta 'mpigliata (55): sostituita dalla giurgiulena.
- 23/11: incidente durante il blocco 12. Un comando ha scritto quattro schede fonti sopra le ricette 56, 57, 58 e 60, che non erano ancora salvate. Le ho riscritte dal testo originale e controllate.
- 23/11: la 47 si chiama "Tonno in agrodolce con le cipolle" e non "alla pizzitana": l'unica fonte su quel nome lo lega a uno chef.
- 23/11: la 43 "Braciole di maiale ripiene" (senza fonte) è sostituita dalle "Vrasciole" (con fonte).
- 23/11: la 36 "Pasta ammollicata con le alici" è sostituita da "Pasta e patate alla tiella": era un doppione della 31 (struncatura ammollicata). La 34 (pasta china) passa a REG.
- 23/11: ricette 13 e 17 passate da CZ/RC a "tutta la Calabria" (le fonti non indicano una provincia). La sardella resta a Crotone (Crucoli, Cirò Marina), con fonti.
- 23/11: l'utente ha chiesto di togliere A Putiga, aumentare le ricette (soprattutto casarecce) e aggiungere i salumi fatti in casa. Indice portato a 60.
- 23/11: Higgsfield autorizzato dall'utente per le immagini. Saldo 465 crediti, circa 0,75 crediti a immagine.
- 23/11: per i salumi stagionati ho scelto la versione sicura (sale nitritato calcolato sul limite di legge, fermentazione con pH misurato, calo peso) e una variante da frigorifero, da consumare cotta.
- Le skill fact-checker e humanizer non sono ancora state usate: le verifiche sono state fatte con la ricerca web, con i dubbi segnati. Da fare prima della consegna.
- Progetto nella cartella `ricettario-calabrese/` del repository, branch `ccr-9e811f96-dg6t17`.
- Per l'impaginazione propongo WeasyPrint invece di Chromium, perché calcola i numeri di pagina dell'indice.
- Per l'EPUB uso pandoc, già installato.
- Per rasterizzare le pagine nei controlli uso `pdftoppm`, già installato (non serve PyMuPDF).
- La skill frontend-design non c'è: applico a mano le stesse regole di impaginazione.
