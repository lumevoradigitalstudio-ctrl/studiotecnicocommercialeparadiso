'use strict';
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const core = require('./core');
const wa = require('./whatsapp');
const { eseguiAutomazioni } = require('./automazioni');
const { esc, euro, dataIt, pagina, avviso } = require('./viste');

const TIPI = {
  benvenuto: 'Benvenuto', premio: 'Premio', recensione: 'Recensione', compleanno: 'Compleanno',
  clienti_persi: 'Cliente perso', promo_settimanale: 'Promo settimanale', giorni_lenti: 'Giorno lento', report: 'Report', manuale: 'Manuale',
};

function creaApp(db, cfg, { pin = process.env.ADMIN_PIN || '1234', segreto = process.env.SEGRETO || crypto.randomBytes(16).toString('hex') } = {}) {
  const token = crypto.createHmac('sha256', segreto).update(`admin:${pin}`).digest('hex');
  const P = (t, c, admin = true) => pagina(t, c, { admin, cfg });

  const rotte = {
    'GET /': (req, res) => redirect(res, '/admin'),

    // ---------- Pagine pubbliche (QR alla cassa) ----------
    'GET /iscriviti': (req, res, q) => html(res, P('Tessera punti', `
      <div class="card"><h1>La tessera di ${esc(cfg.nomePizzeria)} 🎟️</h1>
      <p>Ogni pizza vale <b>${cfg.tessera.puntiPerPizza} punto</b>. Con <b>${cfg.tessera.puntiPerPremio} punti</b> hai <b>${esc(cfg.tessera.premio)}</b>.<br>
      Iscrivendoti ricevi subito <b>${esc(cfg.tessera.regaloBenvenuto)}</b>.</p>${avviso(q)}
      <form method="post" action="/iscriviti">
        <label>Nome</label><input name="nome" required maxlength="80" autocomplete="given-name">
        <label>Cellulare (WhatsApp)</label><input name="telefono" required inputmode="tel" autocomplete="tel" placeholder="333 1234567">
        <label>Compleanno (facoltativo, per il regalo)</label><input name="compleanno" type="date">
        <label style="font-weight:400"><input type="checkbox" name="consenso" value="1" required>
        Accetto di ricevere su WhatsApp punti, premi e offerte di ${esc(cfg.nomePizzeria)}. Posso cancellarmi quando voglio rispondendo STOP.</label>
        <button>Attiva la tessera</button></form>
      <p class="nota">I tuoi dati sono usati solo da ${esc(cfg.nomePizzeria)} per la tessera e le offerte, non vengono ceduti a terzi.</p></div>`, false)),

    'POST /iscriviti': async (req, res) => {
      const f = await form(req);
      try {
        const { cliente, nuovo } = core.registraCliente(db, cfg, { ...f, consenso: f.consenso === '1' });
        html(res, P('Tessera attiva', `<div class="card"><h1>${nuovo ? 'Benvenuto' : 'Bentornato'}, ${esc(cliente.nome)}! 🎉</h1>
          <p>La tua tessera è attiva sul numero <b>${esc(cliente.telefono)}</b>.</p>
          <p>Punti attuali: <b>${cliente.punti}</b> / ${cfg.tessera.puntiPerPremio}</p>
          <p>Al ritiro di' il tuo numero alla cassa per accumulare i punti.</p>
          <a class="btn" href="${esc(cfg.linkApp)}">Ordina dall'app</a></div>`, false));
      } catch (e) { redirect(res, `/iscriviti?err=${encodeURIComponent(e.message)}`); }
    },

    // ---------- Accesso ----------
    'GET /login': (req, res, q) => html(res, P('Accesso', `<div class="card" style="max-width:360px;margin:auto"><h1>Accesso gestione</h1>${avviso(q)}
      <form method="post" action="/login"><label>PIN</label><input name="pin" type="password" inputmode="numeric" autofocus><button>Entra</button></form></div>`, false)),
    'POST /login': async (req, res) => {
      const f = await form(req);
      const ok = f.pin && crypto.timingSafeEqual(Buffer.from(hash(f.pin)), Buffer.from(hash(pin)));
      if (!ok) return redirect(res, '/login?err=PIN+errato');
      res.setHeader('Set-Cookie', `sessione=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
      redirect(res, '/admin');
    },
    'GET /admin/esci': (req, res) => { res.setHeader('Set-Cookie', 'sessione=; Path=/; Max-Age=0'); redirect(res, '/login'); },

    // ---------- Riepilogo ----------
    'GET /admin': (req, res, q) => {
      const k = core.kpi(db, cfg);
      const basse = core.scorteBasse(db);
      html(res, P('Riepilogo', `<h1>Riepilogo</h1>${avviso(q)}
        ${pin === '1234' ? '<p class="err">Stai usando il PIN predefinito 1234: impostane uno tuo (variabile ADMIN_PIN).</p>' : ''}
        <div class="griglia">
          ${kpiBox('Clienti in tessera', k.clienti)}${kpiBox('Nuovi (30 giorni)', k.nuovi30)}
          ${kpiBox('Attivi (30 giorni)', k.attivi30)}${kpiBox('Da riconquistare', k.aRischio)}
          ${kpiBox('Ritiri con tessera (30 gg)', k.ritiri30)}${kpiBox('Scontrino medio', euro(k.scontrinoMedio30))}
          ${kpiBox('Premi da ritirare', k.premiPronti)}${kpiBox('Messaggi in coda', k.daInviare)}
        </div>
        ${basse.length ? `<div class="card"><b>📦 Scorte basse:</b> ${basse.map((i) => esc(`${i.nome} (${i.scorta})`)).join(', ')} – <a href="/admin/magazzino">vai al magazzino</a></div>` : ''}
        <h2>Report di oggi</h2><pre>${esc(core.testoReport(db, cfg))}</pre>
        <form method="post" action="/admin/esegui" class="noprint"><button class="btn grigio">Esegui subito le automazioni</button></form>
        <p class="nota">WhatsApp: modalità <b>${wa.modalita()}</b>. Le automazioni girano da sole ogni 5 minuti.</p>`));
    },
    'POST /admin/esegui': async (req, res) => {
      const e = eseguiAutomazioni(db, cfg);
      await wa.inviaCoda(db);
      const tot = Object.values(e).reduce((a, b) => a + (b || 0), 0);
      redirect(res, `/admin?ok=${encodeURIComponent(`Automazioni eseguite: ${tot} nuovi messaggi in coda`)}`);
    },

    // ---------- Cassa ----------
    'GET /admin/cassa': (req, res, q) => {
      const c = q.tel ? core.trovaCliente(db, q.tel) : null;
      const soglia = cfg.tessera.puntiPerPremio;
      let scheda = '';
      if (q.tel && !c) scheda = `<p class="err">Nessun cliente con questo numero. Fagli inquadrare il QR oppure iscrivilo qui sotto.</p>
        <div class="card"><h2>Iscrivi cliente</h2><form method="post" action="/admin/cassa/iscrivi">
        <input type="hidden" name="telefono" value="${esc(q.tel)}"><label>Nome</label><input name="nome" required>
        <label style="font-weight:400"><input type="checkbox" name="consenso" value="1"> Il cliente accetta di ricevere offerte su WhatsApp</label>
        <button>Iscrivi</button></form></div>`;
      if (c) scheda = `<div class="card"><h2>${esc(c.nome)} <span class="badge">${esc(c.telefono)}</span></h2>
        <p>Punti: <b>${c.punti}</b> / ${soglia} ${c.punti >= soglia ? '<span class="badge rosso">🎁 PREMIO DISPONIBILE</span>' : ''}<br>
        Ritiri: ${c.ritiri} · Speso: ${euro(c.speso)} · Ultimo ritiro: ${dataIt(c.ultimo_ritiro)}</p>
        <form method="post" action="/admin/cassa/ritiro"><input type="hidden" name="telefono" value="${esc(c.telefono)}">
        <div class="griglia"><div><label>Pizze</label><input name="pizze" type="number" min="0" value="1" inputmode="numeric"></div>
        <div><label>Importo €</label><input name="importo" inputmode="decimal" placeholder="es. 24,50"></div></div>
        ${c.punti >= soglia ? `<label style="font-weight:400"><input type="checkbox" name="premio" value="1"> Riscatta ora il premio (${esc(cfg.tessera.premio)})</label>` : ''}
        <button class="btn verde">Registra ritiro</button></form></div>`;
      html(res, P('Cassa', `<h1>Cassa</h1>${avviso(q)}<div class="card"><form method="get" action="/admin/cassa">
        <label>Numero del cliente</label><input name="tel" value="${esc(q.tel || '')}" inputmode="tel" autofocus placeholder="333 1234567">
        <button>Cerca</button></form></div>${scheda}`));
    },
    'POST /admin/cassa/ritiro': async (req, res) => {
      const f = await form(req);
      try {
        const r = core.registraRitiro(db, cfg, { telefono: f.telefono, pizze: f.pizze, importo: f.importo, riscattaPremio: f.premio === '1' });
        const msg = `+${r.guadagnati} punti a ${r.cliente.nome} (totale ${r.cliente.punti})${r.premio ? ' – premio riscattato ✅' : ''}${r.premioSbloccato ? ' – 🎁 ha sbloccato il premio!' : ''}`;
        redirect(res, `/admin/cassa?ok=${encodeURIComponent(msg)}`);
      } catch (e) { redirect(res, `/admin/cassa?tel=${encodeURIComponent(f.telefono || '')}&err=${encodeURIComponent(e.message)}`); }
    },
    'POST /admin/cassa/iscrivi': async (req, res) => {
      const f = await form(req);
      try {
        const { cliente } = core.registraCliente(db, cfg, { ...f, consenso: f.consenso === '1' });
        redirect(res, `/admin/cassa?tel=${cliente.telefono}&ok=${encodeURIComponent('Cliente iscritto')}`);
      } catch (e) { redirect(res, `/admin/cassa?tel=${encodeURIComponent(f.telefono || '')}&err=${encodeURIComponent(e.message)}`); }
    },

    // ---------- Clienti ----------
    'GET /admin/clienti': (req, res, q) => {
      const ordini = { recenti: 'creato_il DESC', migliori: 'speso DESC', persi: 'COALESCE(ultimo_ritiro, creato_il) ASC', punti: 'punti DESC' };
      const ord = ordini[q.ordina] ? q.ordina : 'recenti';
      const righe = db.prepare(`SELECT * FROM clienti ORDER BY ${ordini[ord]} LIMIT 500`).all();
      html(res, P('Clienti', `<h1>Clienti (${righe.length})</h1>${avviso(q)}
        <p>Ordina per: ${Object.keys(ordini).map((k) => `<a class="btn piccolo ${k === ord ? '' : 'grigio'}" href="?ordina=${k}">${k}</a>`).join(' ')}
        <a class="btn piccolo verde" href="/admin/clienti.csv">Scarica CSV</a></p>
        <table><tr><th>Nome</th><th>Telefono</th><th>Punti</th><th>Ritiri</th><th>Speso</th><th>Ultimo ritiro</th><th>WhatsApp</th></tr>
        ${righe.map((c) => `<tr><td><a href="/admin/cassa?tel=${esc(c.telefono)}">${esc(c.nome)}</a></td><td>${esc(c.telefono)}</td><td>${c.punti}</td>
          <td>${c.ritiri}</td><td>${euro(c.speso)}</td><td>${dataIt(c.ultimo_ritiro)}</td>
          <td>${c.consenso_marketing ? `✅ <form method="post" action="/admin/clienti/${c.id}/stop" style="display:inline"><button class="btn piccolo grigio">STOP</button></form>` : '—'}</td></tr>`).join('')}</table>`));
    },
    'POST /admin/clienti/:id/stop': (req, res, q, id) => {
      db.prepare('UPDATE clienti SET consenso_marketing = 0 WHERE id = ?').run(Number(id));
      db.prepare("UPDATE messaggi SET stato = 'annullato' WHERE cliente_id = ? AND stato = 'da_inviare'").run(Number(id));
      redirect(res, '/admin/clienti?ok=Cliente+rimosso+dalle+offerte+WhatsApp');
    },
    'GET /admin/clienti.csv': (req, res) => {
      const righe = db.prepare('SELECT nome, telefono, compleanno, consenso_marketing, punti, ritiri, speso, ultimo_ritiro, creato_il FROM clienti').all();
      const cella = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [Object.keys(righe[0] || { nome: 1 }).join(';'), ...righe.map((r) => Object.values(r).map(cella).join(';'))].join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clienti.csv"' });
      res.end('﻿' + csv);
    },

    // ---------- Messaggi ----------
    'GET /admin/messaggi': (req, res, q) => {
      const stato = ['da_inviare', 'inviato', 'errore', 'annullato'].includes(q.stato) ? q.stato : 'da_inviare';
      const righe = db.prepare('SELECT * FROM messaggi WHERE stato = ? ORDER BY id DESC LIMIT 300').all(stato);
      const manuale = wa.modalita() === 'manuale';
      html(res, P('Messaggi', `<h1>Messaggi WhatsApp</h1>${avviso(q)}
        <p>${['da_inviare', 'inviato', 'errore', 'annullato'].map((s) => `<a class="btn piccolo ${s === stato ? '' : 'grigio'}" href="?stato=${s}">${s.replace('_', ' ')}</a>`).join(' ')}</p>
        ${manuale && stato === 'da_inviare' ? '<p class="nota">Modalità manuale: premi “Invia” per aprire WhatsApp con il messaggio già scritto, poi “Fatto”. Per l\'invio automatico vedi il file README.</p>' : ''}
        <div class="card noprint"><h2>Messaggio a tutti i clienti iscritti</h2><form method="post" action="/admin/messaggi/campagna">
          <textarea name="testo" rows="3" required placeholder="Ciao {nome}! Stasera..."></textarea>
          <p class="nota">{nome} viene sostituito con il nome del cliente. Arriva solo a chi ha dato il consenso.</p><button>Metti in coda</button></form></div>
        <table><tr><th>Quando</th><th>Tipo</th><th>A</th><th>Testo</th><th></th></tr>
        ${righe.map((m) => `<tr><td>${dataIt(m.creato_il)}</td><td><span class="badge">${esc(TIPI[m.tipo] || m.tipo)}</span></td><td>${esc(m.telefono)}</td>
          <td>${esc(m.testo).replace(/\n/g, '<br>')}${m.errore ? `<br><span class="err">${esc(m.errore)}</span>` : ''}</td>
          <td>${m.stato === 'da_inviare' || m.stato === 'errore' ? `<a class="btn piccolo verde" target="_blank" rel="noopener" href="${esc(wa.linkWaMe(m.telefono, m.testo))}">Invia</a>
            <form method="post" action="/admin/messaggi/${m.id}/inviato" style="display:inline"><button class="btn piccolo">Fatto</button></form>
            <form method="post" action="/admin/messaggi/${m.id}/annulla" style="display:inline"><button class="btn piccolo grigio">Annulla</button></form>` : ''}</td></tr>`).join('')}</table>`));
    },
    'POST /admin/messaggi/:id/inviato': (req, res, q, id) => {
      db.prepare("UPDATE messaggi SET stato = 'inviato', inviato_il = ? WHERE id = ?").run(new Date().toISOString(), Number(id));
      redirect(res, '/admin/messaggi');
    },
    'POST /admin/messaggi/:id/annulla': (req, res, q, id) => {
      db.prepare("UPDATE messaggi SET stato = 'annullato' WHERE id = ?").run(Number(id));
      redirect(res, '/admin/messaggi');
    },
    'POST /admin/messaggi/campagna': async (req, res) => {
      const f = await form(req);
      const testo = String(f.testo || '').trim().slice(0, 1000);
      if (!testo) return redirect(res, '/admin/messaggi?err=Scrivi+il+testo');
      const id = Date.now();
      const clienti = db.prepare('SELECT * FROM clienti WHERE consenso_marketing = 1').all();
      const n = clienti.filter((c) => core.accoda(db, { clienteId: c.id, telefono: c.telefono, tipo: 'manuale', chiave: `manuale-${id}-${c.id}`,
        testo: core.compila(testo, core.valoriBase(cfg, c)) })).length;
      await wa.inviaCoda(db);
      redirect(res, `/admin/messaggi?ok=${encodeURIComponent(`${n} messaggi messi in coda`)}`);
    },

    // ---------- Magazzino ----------
    'GET /admin/magazzino': (req, res, q) => {
      const ing = db.prepare('SELECT * FROM ingredienti ORDER BY nome').all();
      const basse = core.scorteBasse(db);
      html(res, P('Magazzino', `<h1>Magazzino e chiusura serale</h1>${avviso(q)}
        <div class="card"><h2>Chiusura serale</h2><p class="nota">A fine serata inserisci l'incasso e quante ne hai vendute (lo vedi dall'app/cassa). Il magazzino si scala da solo e alle ${cfg.automazioni.reportSerale.ora}:00 ti arriva il report.</p>
        <form method="post" action="/admin/chiusura"><div class="griglia">
          <div><label>Incasso €</label><input name="incasso" inputmode="decimal" required></div>
          <div><label>Numero ordini</label><input name="ordini" type="number" min="0" required></div>
          ${cfg.prodotti.map((p, i) => `<div><label>${esc(p.nome)}</label><input name="p${i}" type="number" min="0" value="0"></div>`).join('')}
        </div><button class="btn verde">Salva chiusura</button></form></div>
        ${basse.length ? `<div class="card"><h2>📝 Ordine fornitori pronto</h2><pre>${esc(core.testoOrdineFornitore(cfg, basse))}</pre>
          ${[...new Set(basse.map((b) => b.telefono_fornitore).filter(Boolean))].map((t) => `<a class="btn verde" target="_blank" rel="noopener" href="${esc(wa.linkWaMe(t, core.testoOrdineFornitore(cfg, basse.filter((b) => b.telefono_fornitore === t))))}">Invia a ${esc(basse.find((b) => b.telefono_fornitore === t).fornitore)}</a>`).join(' ')}</div>` : ''}
        <div class="card"><h2>Scorte</h2><form method="post" action="/admin/magazzino"><table><tr><th>Ingrediente</th><th>Scorta</th><th>Minimo</th><th>Arrivato oggi (+)</th></tr>
        ${ing.map((i, n) => `<tr><td>${esc(i.nome)}${i.scorta <= i.scorta_minima ? ' <span class="badge rosso">basso</span>' : ''}<input type="hidden" name="n${n}" value="${esc(i.nome)}"></td>
          <td><input name="s${n}" value="${i.scorta}" inputmode="decimal"></td><td>${i.scorta_minima}</td><td><input name="c${n}" inputmode="decimal" placeholder="0"></td></tr>`).join('')}
        </table><button>Aggiorna scorte</button></form></div>`));
    },
    'POST /admin/magazzino': async (req, res) => {
      const f = await form(req);
      const num = (v) => Number(String(v || '0').replace(',', '.')) || 0;
      for (let n = 0; f[`n${n}`] !== undefined; n++) {
        db.prepare('UPDATE ingredienti SET scorta = ROUND(?, 3) WHERE nome = ?').run(num(f[`s${n}`]) + num(f[`c${n}`]), f[`n${n}`]);
      }
      redirect(res, '/admin/magazzino?ok=Scorte+aggiornate');
    },
    'POST /admin/chiusura': async (req, res) => {
      const f = await form(req);
      const vendite = {};
      cfg.prodotti.forEach((p, i) => { vendite[p.nome] = f[`p${i}`]; });
      const r = core.chiusuraSerale(db, cfg, { incasso: f.incasso, ordini: f.ordini, vendite });
      redirect(res, `/admin/magazzino?ok=${encodeURIComponent(`Chiusura del ${r.data} salvata, magazzino aggiornato`)}`);
    },

    // ---------- QR da stampare ----------
    'GET /admin/qr': async (req, res) => {
      const url = `${cfg.urlPubblico.replace(/\/$/, '')}/iscriviti`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 320 });
      html(res, P('QR', `<div class="card" style="text-align:center"><h1 style="font-size:34px">🎟️ Tessera punti gratuita</h1>
        <p style="font-size:22px">Inquadra e attiva la tessera:<br><b>ogni ${cfg.tessera.puntiPerPremio} pizze, ${esc(cfg.tessera.premio)}</b></p>
        <div style="max-width:320px;margin:auto">${svg}</div><p style="font-size:20px">+ subito ${esc(cfg.tessera.regaloBenvenuto)}</p>
        <p class="nota">${esc(url)}</p><button class="noprint" onclick="print()">Stampa</button></div>`));
    },
  };

  function hash(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
  function kpiBox(t, v) { return `<div class="kpi"><small>${esc(t)}</small><b>${esc(v)}</b></div>`; }

  return async function gestisci(req, res) {
    try {
      const u = new URL(req.url, 'http://x');
      const q = Object.fromEntries(u.searchParams);
      let handler = rotte[`${req.method} ${u.pathname}`];
      let param;
      if (!handler) {
        for (const [k, h] of Object.entries(rotte)) {
          const [m, p] = k.split(' ');
          if (m !== req.method || !p.includes(':')) continue;
          const re = new RegExp(`^${p.replace(/:\w+/, '(\\d+)')}$`);
          const match = u.pathname.match(re);
          if (match) { handler = h; param = match[1]; break; }
        }
      }
      if (!handler) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Pagina non trovata'); }
      if (u.pathname.startsWith('/admin')) {
        const cookie = Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')));
        if (cookie.sessione !== token) return redirect(res, '/login');
      }
      await handler(req, res, q, param);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Errore interno');
    }
  };
}

function html(res, body) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(body); }
function redirect(res, to) { res.writeHead(303, { Location: to }); res.end(); }
function form(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e5) req.destroy(); });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(data))));
    req.on('error', reject);
  });
}

module.exports = { creaApp };
