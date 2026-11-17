'use strict';
const { partiLocali, giorniFa, oreFa } = require('./tempo');
const { accoda, compila, valoriBase, testoReport, scorteBasse, testoOrdineFornitore } = require('./core');

const MARKETING = ['clienti_persi', 'promo_settimanale', 'giorni_lenti'];
const PAUSA_MARKETING_GIORNI = 3; // al massimo una promo ogni 3 giorni per cliente: niente spam

// Esegue un'azione una sola volta per chiave (es. una volta al giorno).
function unaVolta(db, chiave, now, fn) {
  const r = db.prepare('INSERT OR IGNORE INTO esecuzioni (chiave, eseguito_il) VALUES (?, ?)').run(chiave, now.toISOString());
  if (r.changes === 0) return 0;
  return fn();
}

function clientiContattabili(db, now) {
  return db.prepare(`SELECT * FROM clienti c WHERE consenso_marketing = 1 AND NOT EXISTS (
      SELECT 1 FROM messaggi m WHERE m.cliente_id = c.id AND m.tipo IN (${MARKETING.map(() => '?').join(',')})
      AND m.creato_il >= ? AND m.stato != 'annullato')`).all(...MARKETING, giorniFa(now, PAUSA_MARKETING_GIORNI));
}

function eseguiAutomazioni(db, cfg, now = new Date()) {
  const a = cfg.automazioni;
  const L = partiLocali(now, cfg.fusoOrario);
  const nellaFinestra = (ora) => L.ora >= ora && L.ora < ora + 3; // se il server era spento, recupera entro 3 ore
  const esito = {};

  // 1. Richiesta recensione Google dopo il ritiro
  if (a.recensione.attiva && cfg.linkRecensioneGoogle) {
    const ritiri = db.prepare(`SELECT r.id AS ritiro_id, r.cliente_id FROM ritiri r JOIN clienti c ON c.id = r.cliente_id
      WHERE c.consenso_marketing = 1 AND r.creato_il <= ? AND r.creato_il >= ?`)
      .all(oreFa(now, a.recensione.oreDopoRitiro), oreFa(now, 24));
    let n = 0;
    for (const { ritiro_id: ritiroId, cliente_id: clienteId } of ritiri) {
      const recente = db.prepare(`SELECT 1 FROM messaggi WHERE cliente_id = ? AND tipo = 'recensione' AND creato_il >= ?`)
        .get(clienteId, giorniFa(now, a.recensione.nonPiuDiUnaOgniGiorni));
      if (recente) continue;
      const cli = db.prepare('SELECT * FROM clienti WHERE id = ?').get(clienteId);
      if (accoda(db, { clienteId, telefono: cli.telefono, tipo: 'recensione', chiave: `recensione-ritiro-${ritiroId}`, now,
        testo: compila('Grazie {nome} per aver scelto {pizzeria}! 🍕 Com\'era la pizza? Se ti è piaciuta, ci aiuti con una recensione? Bastano 10 secondi: {linkRecensione}', valoriBase(cfg, cli)) })) n++;
    }
    esito.recensioni = n;
  }

  // 2. Compleanni
  if (a.compleanno.attiva && L.ora >= a.compleanno.ora) {
    const festeggiati = db.prepare('SELECT * FROM clienti WHERE consenso_marketing = 1 AND compleanno = ?').all(L.meseGiorno);
    esito.compleanni = festeggiati.filter((c) => accoda(db, {
      clienteId: c.id, telefono: c.telefono, tipo: 'compleanno', chiave: `compleanno-${c.id}-${L.anno}`, now,
      testo: compila(a.compleanno.testo, valoriBase(cfg, c)),
    })).length;
  }

  // 3. Clienti persi (non ordinano da X giorni)
  if (a.clientiPersi.attiva && L.ora >= 10 && L.ora < 20) {
    const soglia = giorniFa(now, a.clientiPersi.giorniSenzaOrdini);
    const pausa = giorniFa(now, a.clientiPersi.pausaGiorni);
    const persi = clientiContattabili(db, now).filter((c) => (c.ultimo_ritiro || c.creato_il) < soglia
      && !db.prepare("SELECT 1 FROM messaggi WHERE cliente_id = ? AND tipo = 'clienti_persi' AND creato_il >= ?").get(c.id, pausa));
    esito.clientiPersi = persi.filter((c) => accoda(db, {
      clienteId: c.id, telefono: c.telefono, tipo: 'clienti_persi', chiave: `persi-${c.id}-${L.data}`, now,
      testo: compila(a.clientiPersi.testo, valoriBase(cfg, c)),
    })).length;
  }

  // 4. Promo settimanale (es. venerdì alle 17)
  if (a.promoSettimanale.attiva && L.giornoSettimana === a.promoSettimanale.giorno && nellaFinestra(a.promoSettimanale.ora)) {
    esito.promoSettimanale = unaVolta(db, `promo-${L.data}`, now, () => clientiContattabili(db, now).filter((c) => accoda(db, {
      clienteId: c.id, telefono: c.telefono, tipo: 'promo_settimanale', chiave: `promo-${c.id}-${L.data}`, now,
      testo: compila(a.promoSettimanale.testo, valoriBase(cfg, c)),
    })).length);
  }

  // 5. Giorni lenti (es. martedì e mercoledì)
  if (a.giorniLenti.attiva && a.giorniLenti.giorni.includes(L.giornoSettimana) && nellaFinestra(a.giorniLenti.ora)) {
    esito.giorniLenti = unaVolta(db, `lenti-${L.data}`, now, () => clientiContattabili(db, now).filter((c) => accoda(db, {
      clienteId: c.id, telefono: c.telefono, tipo: 'giorni_lenti', chiave: `lenti-${c.id}-${L.data}`, now,
      testo: compila(a.giorniLenti.testo, valoriBase(cfg, c)),
    })).length);
  }

  // 6. Report serale + ordine fornitori al titolare
  if (a.reportSerale.attiva && cfg.telefonoTitolare && nellaFinestra(a.reportSerale.ora)) {
    let testo = testoReport(db, cfg, now);
    const basse = scorteBasse(db);
    if (basse.length) testo += `\n\n📝 Ordine pronto per i fornitori:\n${testoOrdineFornitore(cfg, basse)}`;
    esito.report = accoda(db, { telefono: cfg.telefonoTitolare, tipo: 'report', chiave: `report-${L.data}`, testo, now }) ? 1 : 0;
  }

  return esito;
}

module.exports = { eseguiAutomazioni };
