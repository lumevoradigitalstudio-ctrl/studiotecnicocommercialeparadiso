'use strict';
const { partiLocali, giorniFa } = require('./tempo');

function normalizzaTelefono(input) {
  let t = String(input || '').replace(/[^\d+]/g, '');
  if (t.startsWith('+')) t = t.slice(1);
  if (t.startsWith('00')) t = t.slice(2);
  if (/^3\d{8,9}$/.test(t)) t = '39' + t; // cellulare italiano senza prefisso
  if (!/^\d{10,15}$/.test(t)) return null;
  return t;
}

function normalizzaCompleanno(input) {
  if (!input) return null;
  const s = String(input).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); // da <input type=date>
  if (m) return `${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})/); // GG/MM
  if (m) return `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function compila(testo, valori) {
  return String(testo).replace(/\{(\w+)\}/g, (_, k) => (valori[k] ?? ''));
}

function valoriBase(cfg, cliente) {
  return {
    nome: cliente ? cliente.nome.split(' ')[0] : '',
    pizzeria: cfg.nomePizzeria,
    linkApp: cfg.linkApp,
    linkRecensione: cfg.linkRecensioneGoogle,
    premio: cfg.tessera.premio,
    punti: cliente ? cliente.punti : '',
    puntiPerPremio: cfg.tessera.puntiPerPremio,
  };
}

// Mette un messaggio in coda. La chiave impedisce di mandare due volte lo stesso messaggio.
function accoda(db, { clienteId = null, telefono, tipo, chiave, testo, now = new Date() }) {
  const r = db.prepare(`INSERT OR IGNORE INTO messaggi (cliente_id, telefono, tipo, chiave, testo, creato_il)
    VALUES (?, ?, ?, ?, ?, ?)`).run(clienteId, telefono, tipo, chiave, testo, now.toISOString());
  return r.changes > 0;
}

function trovaCliente(db, telefono) {
  const t = normalizzaTelefono(telefono);
  if (!t) return null;
  return db.prepare('SELECT * FROM clienti WHERE telefono = ?').get(t) || null;
}

function registraCliente(db, cfg, { nome, telefono, compleanno, consenso }, now = new Date()) {
  const tel = normalizzaTelefono(telefono);
  nome = String(nome || '').trim().slice(0, 80);
  if (!nome) throw new Error('Inserisci il nome');
  if (!tel) throw new Error('Numero di telefono non valido');
  const esistente = db.prepare('SELECT * FROM clienti WHERE telefono = ?').get(tel);
  if (esistente) {
    // Aggiorna i dati ma non azzera i punti
    db.prepare(`UPDATE clienti SET nome = ?, compleanno = COALESCE(?, compleanno),
      consenso_marketing = MAX(consenso_marketing, ?) WHERE id = ?`)
      .run(nome, normalizzaCompleanno(compleanno), consenso ? 1 : 0, esistente.id);
    return { cliente: db.prepare('SELECT * FROM clienti WHERE id = ?').get(esistente.id), nuovo: false };
  }
  const r = db.prepare(`INSERT INTO clienti (nome, telefono, compleanno, consenso_marketing, creato_il)
    VALUES (?, ?, ?, ?, ?)`).run(nome, tel, normalizzaCompleanno(compleanno), consenso ? 1 : 0, now.toISOString());
  const cliente = db.prepare('SELECT * FROM clienti WHERE id = ?').get(r.lastInsertRowid);
  if (cliente.consenso_marketing) {
    accoda(db, {
      clienteId: cliente.id, telefono: tel, tipo: 'benvenuto', chiave: `benvenuto-${cliente.id}`, now,
      testo: compila('Benvenuto nella tessera di {pizzeria}, {nome}! 🍕 Per te {regalo}. Ogni pizza vale 1 punto: con {puntiPerPremio} punti hai {premio}. Ordina dall\'app: {linkApp}',
        { ...valoriBase(cfg, cliente), regalo: cfg.tessera.regaloBenvenuto }),
    });
  }
  return { cliente, nuovo: true };
}

// Da usare alla cassa quando il cliente ritira (ordine da app o da telefono).
function registraRitiro(db, cfg, { telefono, pizze, importo, riscattaPremio }, now = new Date()) {
  const cliente = trovaCliente(db, telefono);
  if (!cliente) throw new Error('Cliente non trovato: fallo iscrivere con il QR');
  pizze = Math.max(0, Math.floor(Number(pizze) || 0));
  importo = Math.max(0, Number(String(importo || 0).replace(',', '.')) || 0);
  const soglia = cfg.tessera.puntiPerPremio;
  let punti = cliente.punti;
  let premio = false;
  if (riscattaPremio) {
    if (punti < soglia) throw new Error(`Punti insufficienti (${punti}/${soglia})`);
    punti -= soglia;
    premio = true;
  }
  const guadagnati = pizze * cfg.tessera.puntiPerPizza;
  punti += guadagnati;
  const ritiro = db.prepare(`INSERT INTO ritiri (cliente_id, importo, pizze, punti, premio_riscattato, creato_il)
    VALUES (?, ?, ?, ?, ?, ?)`).run(cliente.id, importo, pizze, guadagnati, premio ? 1 : 0, now.toISOString());
  db.prepare(`UPDATE clienti SET punti = ?, ritiri = ritiri + 1, speso = speso + ?, ultimo_ritiro = ? WHERE id = ?`)
    .run(punti, importo, now.toISOString(), cliente.id);
  const aggiornato = db.prepare('SELECT * FROM clienti WHERE id = ?').get(cliente.id);
  const sbloccato = cliente.punti < soglia && punti >= soglia;
  if (sbloccato && aggiornato.consenso_marketing) {
    accoda(db, {
      clienteId: cliente.id, telefono: cliente.telefono, tipo: 'premio', chiave: `premio-${ritiro.lastInsertRowid}`, now,
      testo: compila('Complimenti {nome}! 🎁 Hai raggiunto {punti} punti: al prossimo ritiro da {pizzeria} hai {premio}.', valoriBase(cfg, aggiornato)),
    });
  }
  return { cliente: aggiornato, guadagnati, premio, premioSbloccato: sbloccato };
}

// Chiusura serale: registra incasso e vendite, scala il magazzino.
function chiusuraSerale(db, cfg, { incasso, ordini, vendite }, now = new Date()) {
  const { data } = partiLocali(now, cfg.fusoOrario);
  const pulite = {};
  for (const [k, v] of Object.entries(vendite || {})) {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    if (n > 0) pulite[k] = n;
  }
  const precedente = db.prepare('SELECT vendite FROM chiusure WHERE data = ?').get(data);
  const consumi = (v) => {
    const tot = {};
    for (const p of cfg.prodotti) {
      const q = v[p.nome] || 0;
      for (const [ing, qta] of Object.entries(p.ricetta || {})) tot[ing] = (tot[ing] || 0) + qta * q;
    }
    return tot;
  };
  const nuovi = consumi(pulite);
  const vecchi = precedente ? consumi(JSON.parse(precedente.vendite)) : {};
  const upd = db.prepare('UPDATE ingredienti SET scorta = MAX(0, ROUND(scorta - ?, 3)) WHERE nome = ?');
  for (const ing of new Set([...Object.keys(nuovi), ...Object.keys(vecchi)])) {
    upd.run((nuovi[ing] || 0) - (vecchi[ing] || 0), ing); // se rifai la chiusura, conta solo la differenza
  }
  db.prepare(`INSERT INTO chiusure (data, incasso, ordini, vendite, creato_il) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(data) DO UPDATE SET incasso = excluded.incasso, ordini = excluded.ordini, vendite = excluded.vendite`)
    .run(data, Number(String(incasso || 0).replace(',', '.')) || 0, Math.floor(Number(ordini) || 0), JSON.stringify(pulite), now.toISOString());
  return { data, consumi: nuovi };
}

function scorteBasse(db) {
  return db.prepare('SELECT * FROM ingredienti WHERE scorta <= scorta_minima ORDER BY nome').all();
}

function testoOrdineFornitore(cfg, ingredienti) {
  const righe = ingredienti.map((i) => `- ${i.nome}: ${i.quantita_riordino}`).join('\n');
  return `Buongiorno, sono ${cfg.nomePizzeria}. Vorrei ordinare:\n${righe}\nGrazie!`;
}

function kpi(db, cfg, now = new Date()) {
  const g = (sql, ...a) => db.prepare(sql).get(...a);
  const sogliaPersi = giorniFa(now, cfg.automazioni.clientiPersi.giorniSenzaOrdini);
  return {
    clienti: g('SELECT COUNT(*) n FROM clienti').n,
    conConsenso: g('SELECT COUNT(*) n FROM clienti WHERE consenso_marketing = 1').n,
    nuovi30: g('SELECT COUNT(*) n FROM clienti WHERE creato_il >= ?', giorniFa(now, 30)).n,
    attivi30: g('SELECT COUNT(*) n FROM clienti WHERE ultimo_ritiro >= ?', giorniFa(now, 30)).n,
    aRischio: g('SELECT COUNT(*) n FROM clienti WHERE COALESCE(ultimo_ritiro, creato_il) < ?', sogliaPersi).n,
    ritiri30: g('SELECT COUNT(*) n FROM ritiri WHERE creato_il >= ?', giorniFa(now, 30)).n,
    scontrinoMedio30: g('SELECT AVG(importo) v FROM ritiri WHERE importo > 0 AND creato_il >= ?', giorniFa(now, 30)).v || 0,
    daInviare: g("SELECT COUNT(*) n FROM messaggi WHERE stato = 'da_inviare'").n,
    premiPronti: g('SELECT COUNT(*) n FROM clienti WHERE punti >= ?', cfg.tessera.puntiPerPremio).n,
  };
}

function testoReport(db, cfg, now = new Date()) {
  const { data } = partiLocali(now, cfg.fusoOrario);
  const k = kpi(db, cfg, now);
  const ch = db.prepare('SELECT * FROM chiusure WHERE data = ?').get(data);
  const settimanaFa = new Date(now.getTime() - 7 * 86400000);
  const chPrec = db.prepare('SELECT * FROM chiusure WHERE data = ?').get(partiLocali(settimanaFa, cfg.fusoOrario).data);
  const inizio = giorniFa(now, 1);
  const oggi = db.prepare('SELECT COUNT(*) n FROM ritiri WHERE creato_il >= ?').get(inizio).n;
  const nuoviOggi = db.prepare('SELECT COUNT(*) n FROM clienti WHERE creato_il >= ?').get(inizio).n;
  const basse = scorteBasse(db);
  const r = [`📊 ${cfg.nomePizzeria} – report del ${data.split('-').reverse().join('/')}`];
  if (ch) {
    r.push(`💶 Incasso: ${ch.incasso.toFixed(2)} € – ${ch.ordini} ordini`);
    if (chPrec && chPrec.incasso > 0) {
      const d = ((ch.incasso - chPrec.incasso) / chPrec.incasso) * 100;
      r.push(`   ${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}% rispetto a 7 giorni fa (${chPrec.incasso.toFixed(2)} €)`);
    }
    const top = Object.entries(JSON.parse(ch.vendite)).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) r.push(`🍕 Più vendute: ${top.map(([n, q]) => `${n} (${q})`).join(', ')}`);
  } else {
    r.push('⚠️ Chiusura serale non ancora inserita.');
  }
  r.push(`🎟️ Ritiri con tessera: ${oggi} – nuovi iscritti: ${nuoviOggi} (totale ${k.clienti})`);
  r.push(`😴 Clienti che non tornano da ${cfg.automazioni.clientiPersi.giorniSenzaOrdini}+ giorni: ${k.aRischio}`);
  if (basse.length) r.push(`📦 Scorte basse: ${basse.map((i) => `${i.nome} (${i.scorta})`).join(', ')}`);
  if (k.daInviare) r.push(`✉️ Messaggi in attesa di invio: ${k.daInviare}`);
  return r.join('\n');
}

module.exports = {
  normalizzaTelefono, normalizzaCompleanno, compila, valoriBase, accoda, trovaCliente,
  registraCliente, registraRitiro, chiusuraSerale, scorteBasse, testoOrdineFornitore, kpi, testoReport,
};
