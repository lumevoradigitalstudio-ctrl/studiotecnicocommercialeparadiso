# STATO del progetto

Ultimo aggiornamento: 2026-11-23

## Fasi
| Fase | Stato |
|---|---|
| 0 — Piano | ✅ indice rivisto (rev. 2: 60 ricette, senza A Putiga, con salumi di casa) |
| 1 — Ricerca e scrittura IT | blocco 1 approvato dall'utente; blocchi 2-7 scritti (35/60) |
| 2 — Edizione EN | non iniziata |
| 3 — Immagini | non iniziata |
| 4 — Impaginazione ed esportazione | non iniziata |
| 5 — Controllo qualità | non iniziata |
| 6 — Kit di vendita | non iniziata |

## Ricette completate
Bozze (10/60). Blocco 1 (stile approvato): 05, 09, 29, 50, 59. Blocco 2 (capitolo Salumi completo): apertura del capitolo, 01, 02, 03, 04, 06.
Blocco 3 (conserve): 07, 08, 10, 11, 12.
Blocco 4: 13, 14, 15, 16, 17 (capitolo Conserve completo).
Blocco 5: 18, 19, 20, 21, 22 (capitolo Antipasti completo).
Blocco 6: 23, 24, 25, 26, 27.
Blocco 7: 28 (capitolo Pane completo), 30, 31, 32, 33.
Controllo automatico: `python3 controlli/controlla_ricette.py`.

## Da ricevere dall'utente
- [NOME AUTORE] del titolare.
- Conferma di pubblico e formato (A4 verticale).
- Il marchio A Putiga resta come editore, in copertina e nei colori? ("A Putiga lasciala stare": per ora ho tolto prodotti, box e link)
- Ok all'installazione di WeasyPrint e Python-Markdown.
- Eventuali foto vere in `foto/` (ora è vuota).

## [DA VERIFICARE]
Molti punti vengono dalla stessa causa: i siti ufficiali (iss.it, salute.gov.it, eur-lex, regione.calabria.it, masaf) sono bloccati dal proxy di questa sessione e l'utente ha rifiutato di sbloccarli. I numeri vengono da sintesi secondarie e vanno confrontati con i testi originali prima della vendita.

| Voce | Dove | Cosa controllare |
|---|---|---|
| Proporzione aceto-acqua, tempo di pastorizzazione per vasetti da 250 ml, durata | ricetta 09 | testo originale delle linee guida ISS |
| Limite dei nitriti (80 mg/kg) e come è espresso | ricetta 05 | allegato II del Reg. UE 2023/2108 |
| Dose di peperoncino, sale totale 2,8%, soglia di pH 5,3, affumicatura, durata, stato IGP | ricetta 05 | fonti di Spilinga, eAmbrosia |
| Lunghezza dei fileja, iscrizione PAT | ricetta 29 | elenco PAT, fonti locali |
| Varianti dei turdilli con uova o lievito | ricetta 59 | fonti locali |
| Disciplinari Lamezia DOC e Greco di Bianco DOC | ricette 50, 59 | sito MASAF |
| Nomi dialettali di soppressata e pancetta, pressatura, sale totale, conservazione dei salumi | ricette 01-04, 06 | fonti dialettologiche, disciplinari completi |
| Dose di acido nella salsa (USDA contro fonti italiane), tempi di pastorizzazione, durata in frigorifero dei peperoncini ripieni, dosi della salamoia per le olive | ricette 07, 08, 10, 11, 12 | testo ISS originale, USDA |
| Funghi (tempi, aceto), sardella (testo Reg. CE 1967/2006, deroga 2010), miele di fichi (sicurezza in dispensa), PAT delle polpette | ricette 13-17 | ISS, EUR-Lex, MASAF |
| **Pitticelle (21): nessuna fonte trovata.** Se non si trova una fonte, sostituirla con un'altra ricetta | ricetta 21 | CCIAA Reggio, Cavalcanti |
| Temperatura della ricotta, zona IGP della cipolla di Tropea | ricette 19, 20 | disciplinare IGP |
| Farina della pitta catanzarese, nomi delle zeppole per zona | ricette 24, 27 | fonti catanzaresi |
| **Doppione:** la 31 (struncatura ammollicata) ha lo stesso condimento della 36 (pasta ammollicata). Proposta: sostituire la 36 | ricette 31, 36 | decisione dell'utente |
| Frese (nessuna fonte), storia della struncatura, provincia della millecosedde, cicerchia | ricette 28, 31, 33 | fonti calabresi |
| Voci `[DV]` dell'indice (n. 06, 13, 16, 21, 32, 34, 38, 40, 43, 48, 52, 53, 60) | indice | provincia o nome |
| Norma sulla pesca del novellame | ricetta 04 | Riferimento normativo esatto e in vigore |
| Elenco DOP/IGP | tutte | Il PDF della Regione è del 23/03/2023: confrontarlo con il registro MASAF/eAmbrosia più recente |
| Presenza nell'elenco PAT | tutte | Confermare per ogni piatto in Fase 1 |

## Decisioni prese
- 23/11: ricette 13 e 17 passate da CZ/RC a "tutta la Calabria" (le fonti non indicano una provincia). La sardella resta a Crotone (Crucoli, Cirò Marina), con fonti.
- 23/11: l'utente ha chiesto di togliere A Putiga, aumentare le ricette (soprattutto casarecce) e aggiungere i salumi fatti in casa. Indice portato a 60.
- 23/11: Higgsfield autorizzato dall'utente per le immagini. Saldo 465 crediti, circa 0,75 crediti a immagine.
- 23/11: per i salumi stagionati ho scelto la versione sicura (sale nitritato calcolato sul limite di legge, fermentazione con pH misurato, calo peso) e una variante da frigorifero, da consumare cotta.
- La skill fact-checker non è ancora stata usata in modo formale: ho fatto verifiche con la ricerca web e segnato i dubbi. La uso prima di chiudere ogni ricetta.
- Progetto nella cartella `ricettario-calabrese/` del repository, branch `ccr-9e811f96-dg6t17`.
- Per l'impaginazione propongo WeasyPrint invece di Chromium, perché calcola i numeri di pagina dell'indice.
- Per l'EPUB uso pandoc, già installato.
- Per rasterizzare le pagine nei controlli uso `pdftoppm`, già installato (non serve PyMuPDF).
- La skill frontend-design non c'è: applico a mano le stesse regole di impaginazione.
