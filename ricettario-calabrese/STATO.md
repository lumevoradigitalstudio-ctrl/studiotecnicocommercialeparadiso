# STATO del progetto

Ultimo aggiornamento: 2026-11-23

## Fasi
| Fase | Stato |
|---|---|
| 0 — Piano | ✅ piano e indice scritti (`PIANO.md`), **STOP: in attesa di approvazione** |
| 1 — Ricerca e scrittura IT | non iniziata |
| 2 — Edizione EN | non iniziata |
| 3 — Immagini | non iniziata |
| 4 — Impaginazione ed esportazione | non iniziata |
| 5 — Controllo qualità | non iniziata |
| 6 — Kit di vendita | non iniziata |

## Ricette completate
Nessuna (0/38).

## Da ricevere dall'utente
- [NOME AUTORE] del titolare.
- Conferma di pubblico, numero di ricette (38) e formato (A4 verticale): sono i valori consigliati nel prompt, usati in attesa di conferma.
- Ok all'installazione di WeasyPrint e Python-Markdown.
- Eventuali foto vere in `foto/` (ora è vuota).

## [DA VERIFICARE]
| Voce | Dove | Cosa controllare |
|---|---|---|
| Provincia di Lagane e ceci (13) | indice | Catanzaro o Cosenza |
| Provincia di Pasta china (15) | indice | Reggio o tutta la regione |
| Nome e zona della capra al sugo (17) | indice | Nome dialettale e paese |
| Provincia di Alici arriganate (23), Ciambotta (27), Pitta 'nchiusa (34) | indice | Attribuzione a Crotone; se non regge, scegliere altri piatti crotonesi |
| Provincia della parmigiana alla calabrese (28) | indice | Vibo o tutta la regione |
| Norma sulla pesca del novellame | ricetta 04 | Riferimento normativo esatto e in vigore |
| Elenco DOP/IGP | tutte | Il PDF della Regione è del 23/03/2023: confrontarlo con il registro MASAF/eAmbrosia più recente |
| Presenza nell'elenco PAT | tutte | Confermare per ogni piatto in Fase 1 |

## Decisioni prese
- Progetto nella cartella `ricettario-calabrese/` del repository, branch `ccr-9e811f96-dg6t17`.
- Per l'impaginazione propongo WeasyPrint invece di Chromium, perché calcola i numeri di pagina dell'indice.
- Per l'EPUB uso pandoc, già installato.
- Per rasterizzare le pagine nei controlli uso `pdftoppm`, già installato (non serve PyMuPDF).
- La skill frontend-design non c'è: applico a mano le stesse regole di impaginazione.
- Lo strumento immagini disponibile (Higgsfield via MCP) ha costi a crediti: chiedo prima di usarlo (Fase 3).
