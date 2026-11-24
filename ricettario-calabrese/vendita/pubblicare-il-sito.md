# Pubblicare il sito su ricettario.aputiga.it

Da girare a chi gestisce il dominio aputiga.it (o da fare tu, se hai l'accesso al pannello).

**Il pacchetto:** `sito-ricettario-aputiga.zip` (84 MB, 67 file). È un sito statico: solo HTML, CSS, immagini, video e i libri da scaricare. Niente database, niente PHP, niente cookie.
Dentro lo zip `index.html` è la pagina italiana, `en/index.html` quella inglese, `d/` contiene le pagine di download a cui Stripe manda chi ha pagato (non vanno linkate da nessuna parte; `robots.txt` le nasconde ai motori di ricerca).

---

## Caso A — aputiga.it è su un hosting classico (Aruba, Register.it, SiteGround, cPanel…)

1. Nel pannello dell'hosting crea il **sottodominio** `ricettario.aputiga.it` (di solito alla voce "Sottodomini" o "Domini"), con una cartella sua, per esempio `/ricettario`.
2. Carica lo zip in quella cartella con il **File Manager** del pannello ed **estrailo**. Alla fine `index.html` deve stare direttamente nella cartella del sottodominio, non in una sottocartella.
   Se il File Manager non accetta file grandi (i PDF pesano 31 MB), estrai lo zip sul computer e carica la cartella via **FTP**.
3. Attiva il certificato **SSL/HTTPS** gratuito per il sottodominio (Let's Encrypt o simile).
4. Controlla che si aprano:
   - https://ricettario.aputiga.it
   - https://ricettario.aputiga.it/en/
   - https://ricettario.aputiga.it/d/aJgCJbdDj9QL/ (pagina di download italiana)
   - https://ricettario.aputiga.it/d/0zorJh5ufDXr/ (pagina di download inglese)

## Caso B — aputiga.it è su Shopify, Wix, Squarespace o simili (che non ospitano file)

Il sito va su un hosting gratuito per siti statici e il sottodominio lo punta lì.
1. Crea un account su **Netlify** (netlify.com), poi "Add new site" → "Deploy manually" e trascina la cartella estratta dallo zip.
2. Nel sito Netlify: "Domain settings" → aggiungi il dominio personalizzato `ricettario.aputiga.it`.
3. Nel pannello DNS di aputiga.it aggiungi un record **CNAME**: nome `ricettario`, valore `<nome-del-sito>.netlify.app` (Netlify mostra il valore esatto).
4. L'HTTPS si attiva da solo in qualche minuto. Poi fai i controlli del punto A4.

Nota: Cloudflare Pages non va bene così com'è, perché accetta file fino a 25 MB e i PDF ne pesano 31.

---

## Dopo la pubblicazione: la prova d'acquisto
1. Apri https://ricettario.aputiga.it, premi "Acquista il PDF" e paga con la tua carta.
2. Controlla che, dopo il pagamento, si apra la pagina di download e che PDF ed EPUB si scarichino.
3. Nella dashboard di Stripe → Pagamenti, rimborsa il pagamento di prova.
4. Ripeti con la pagina inglese.

## Se cambia qualcosa
Il sito si rigenera con `python3 sito/costruisci_sito.py` (dalla cartella `ricettario-calabrese`) e lo zip si rifà dalla cartella `sito/pubblico/`. Poi va ricaricato sull'hosting.
