# Ricettario calabrese A Putiga — regole permanenti

Progetto: ricettario digitale di cucina tipica calabrese, due edizioni separate (IT ed EN), venduto come PDF (EPUB facoltativo) con il marchio **"A Putiga – Sapori di Calabria"** (Lamezia Terme, https://aputiga.it). Chi lo compra deve riuscire a cucinare ogni ricetta al primo tentativo.

Lo stato del lavoro è in `STATO.md`, il piano e l'indice in `PIANO.md`. Leggili all'inizio di ogni sessione e aggiorna `STATO.md` dopo ogni blocco o fase.

## Contesto
- Autore/editore: A Putiga – Sapori di Calabria. Titolare: [NOME AUTORE — da ricevere].
- Tono: caldo, familiare, narrativo, con richiami alla "putìga", la bottega di paese. Niente toni da pubblicità.
- Pubblico: italiani e calabresi fuori regione; stranieri e italo-discendenti che vogliono la cucina di casa.
- Formato: A4 verticale. Numero di ricette: 38.

## Identità visiva
- Colori: carta `#EFDCB6`, carta chiara `#F6EAD0`, inchiostro `#2E2A1A`, verde oliva `#4D4C22`, rosso `#A3281C`, kraft `#C69C6D`.
- Caratteri (Google Fonts, licenza OFL, incorporati nel PDF): titoli "IM Fell English SC", testo "EB Garamond".

## Prodotti A Putiga
Filetti di melanzane sott'olio, olive nere infornate, peperoncino piccante "Diavolino", 'nduja, formaggio vaccino semistagionato, pomodori secchi sott'olio, olive schiacciate, soppressata calabrese, marmellata di bergamotto, caciocavallo silano.
Box "Con i prodotti A Putiga" / "With A Putiga products" solo dove ha senso, con link a https://aputiga.it.

## Struttura fissa di ogni ricetta (identica in IT ed EN)
File `ricette/it/NN-nome.md` e `ricette/en/NN-name.md`: intestazione YAML per i campi strutturati, poi il testo.
1. Titolo italiano + nome dialettale (se esiste) + titolo inglese (solo EN).
2. Zona/provincia di origine; stagione o festa legata al piatto.
3. Introduzione narrativa di 80-120 parole.
4. Porzioni, preparazione, cottura, tempo totale, difficoltà (facile / media / impegnativa).
5. Ingredienti in g e ml; nell'EN anche oz/cups e °F tra parentesi.
6. Passaggi numerati, una azione per passaggio, verbi all'imperativo, indizi sensoriali e temperature ("finché la cipolla è trasparente, circa 6 minuti").
7. Consigli, errori da evitare, varianti locali, conservazione.
8. Sostituzioni per chi vive fuori Calabria.
9. Allergeni secondo i 14 allergeni UE (Reg. UE 1169/2011, all. II).
10. Prodotti DOP/IGP col nome ufficiale, verificati sull'elenco della Regione Calabria o del MASAF.
11. Abbinamento facoltativo con un vino DOC calabrese verificato.
Le fonti di ogni ricetta vanno in `fonti/NN-nome.md`.

## Originalità
- Testi scritti da zero. Mai copiare frasi, procedimenti o foto da siti, blog o libri. Le fonti servono solo a verificare ingredienti, tradizione e varianti.
- Mai usare immagini trovate online.

## Niente invenzioni
- Nessuna origine, data, aneddoto o "segreto della nonna" non verificato.
- Fonti in disaccordo: scriverlo ("a Cosenza…, a Reggio invece…").
- Incertezza: scrivere `[DA VERIFICARE]` e annotarlo in `STATO.md`.
- Ogni fatto storico o normativo ha una fonte annotata in `fonti/`.

## Sicurezza alimentare
- Conserve sott'olio, sott'aceto, salse e preparazioni a rischio botulino: seguire le "Linee guida per la corretta preparazione delle conserve alimentari in ambito domestico" (ISS – Centro Nazionale di Riferimento per il Botulismo / Ministero della Salute) e citarle.
- Pratica tradizionale non sicura o non più legale: presentarla come storica e dare la versione sicura (es. sardella col novellame, struncatura con gli scarti di macinatura).

## Edizione inglese
Localizzare, non tradurre parola per parola: tenere i nomi italiani dei piatti, spiegare gli ingredienti locali, convertire le misure, usare termini culinari dell'inglese internazionale.

## Immagini
- Ordine delle fonti: (1) foto vere in `foto/`; (2) strumento di generazione immagini via MCP, solo dopo il mio ok se ha costi o crediti; (3) altrimenti solo prompt in `immagini/prompt.md`, segnalando che mancano.
- Per ricetta: 1 immagine principale (piatto finito) + 3-6 passaggi chiave.
- Stile: luce naturale laterale, legno o lino, ceramiche artigianali, toni caldi; niente persone riconoscibili, loghi di altri marchi o testo nell'immagine. Guida completa in `immagini/stile.md`.
- Ogni immagine IA porta la dicitura "Immagine illustrativa generata con IA" / "Illustrative image generated with AI"; la pagina dei crediti lo spiega. Mai far passare un'immagine IA per una foto reale.
- Registro obbligatorio `immagini/registro.csv`: file, ricetta, origine (foto vera / IA), strumento, prompt.
- File in `immagini/NN-nome/`, lato lungo 2000 px, JPEG qualità 85.

## Stile dei testi
Frasi brevi, imperativo nei passaggi, niente toni pubblicitari. Prima della consegna passare i testi con la skill humanizer.

## Skill da usare
pdf (creazione e controllo PDF), fact-checker (fase 1), humanizer (prima della consegna), verify-before-done (fase 5), direct-response-copy e offer-and-pricing (fase 6). frontend-design non è installata: applicare comunque buone regole di impaginazione.

## Confini
- Lavorare solo in questa cartella. Non pubblicare, caricare, vendere o condividere nulla online; niente account, acquisti o servizi a pagamento senza chiedere.
- Nessuna foto, logo, marchio o nome di persone reali (chef, personaggi famosi) per promuovere il libro.
- Solo quanto richiesto: niente siti web, app o funzioni extra.

## Fermarsi e chiedere prima di
- passare alla fase successiva quando la fase indica STOP;
- cancellare o sovrascrivere file creati dall'utente (soprattutto in `foto/`);
- installare dipendenze o usare uno strumento a pagamento;
- scegliere tra due versioni di una ricetta quando le fonti sono in conflitto e la scelta cambia il piatto;
- dopo 2 tentativi falliti di risolvere lo stesso errore.

## Aggiornamenti
Dopo ogni blocco o fase: una riga con ✅ fatto, cosa manca, problemi. Ogni "fatto" si basa su un risultato reale (file, comando, controllo). Se la sessione si allunga, riassumere lo stato in `STATO.md` prima di compattare.
