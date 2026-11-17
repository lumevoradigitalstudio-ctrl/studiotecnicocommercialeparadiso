# Pizzeria Autopilota 🍕

Sistema automatico per una pizzeria d'asporto. Lavora **accanto alla tua app di ordinazione**, senza toccarla.

- **Tessera punti** con QR alla cassa (iscrizione dal telefono del cliente)
- **Messaggi WhatsApp automatici**: benvenuto, premio raggiunto, richiesta di recensione Google, promo del venerdì, giorni lenti, clienti persi, compleanni
- **Messaggio a tutti** gli iscritti con un clic (es. "stasera c'è la partita")
- **Magazzino**: la chiusura serale scala gli ingredienti in base alle pizze vendute e prepara l'ordine per i fornitori
- **Report serale** su WhatsApp al titolare
- Regola anti-spam: al massimo una promo ogni 3 giorni per cliente, solo a chi ha dato il consenso

La strategia completa è in **[STRATEGIA.md](STRATEGIA.md)**.

## Avvio

Serve Node.js 22.5 o più recente.

```bash
npm install
cp config.example.json config.json   # poi modifica nome, link, prodotti e ingredienti
ADMIN_PIN=un-tuo-pin npm start
```

Apri `http://localhost:3000` ed entra con il PIN.

| Pagina | A cosa serve |
|---|---|
| `/iscriviti` | Pagina pubblica per la tessera (quella del QR) |
| `/admin` | Riepilogo, numeri e report |
| `/admin/cassa` | Cerchi il numero del cliente e registri il ritiro e i punti |
| `/admin/clienti` | Elenco clienti, esportazione CSV, pulsante STOP |
| `/admin/messaggi` | Coda dei messaggi WhatsApp + messaggio a tutti |
| `/admin/magazzino` | Chiusura serale, scorte, ordine ai fornitori |
| `/admin/qr` | Cartello con il QR da stampare |

## Configurazione (`config.json`)

- `urlPubblico`: l'indirizzo internet dove gira il sistema. Il QR punta a questo indirizzo.
- `linkApp`, `linkRecensioneGoogle`, `telefonoTitolare` (formato `39333...`).
- `tessera`: punti per pizza, punti per il premio, premio, regalo di benvenuto.
- `automazioni`: testi, giorni (0 = domenica … 5 = venerdì) e orari di ogni messaggio. Nei testi puoi usare `{nome}`, `{pizzeria}`, `{linkApp}`.
- `prodotti`: nome, prezzo e ricetta (quanto ingrediente usa ogni prodotto).
- `ingredienti`: scorta minima, quantità da riordinare, fornitore e telefono del fornitore.

## WhatsApp

- **Modalità manuale (predefinita):** i messaggi preparati dal sistema compaiono in *Messaggi*. Premi **Invia** e WhatsApp si apre con il testo già scritto. Funziona subito, senza costi.
- **Modalità automatica:** imposta `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID` (WhatsApp Business Cloud API di Meta). I messaggi partono da soli.
  ⚠️ Meta permette messaggi liberi solo entro 24 ore dall'ultimo messaggio del cliente. Per le promo serve registrare dei **modelli (template) approvati** su Meta. Questo passo va completato prima di usare l'invio automatico per le campagne.

## Dove farlo girare

Le automazioni partono ogni 5 minuti, quindi il sistema deve restare acceso: un piccolo server cloud, un mini-PC o un Raspberry Pi in pizzeria con un indirizzo pubblico. I dati stanno in `data/pizzeria.db`: fanne una copia di sicurezza ogni tanto.

## Test

```bash
npm test
```
