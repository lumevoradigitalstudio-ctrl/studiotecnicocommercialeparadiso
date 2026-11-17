'use strict';
const http = require('node:http');
const path = require('node:path');
const { loadConfig, ROOT } = require('./config');

const cfg = loadConfig();
process.env.TZ = cfg.fusoOrario || 'Europe/Rome';

const { openDb } = require('./db');
const { creaApp } = require('./app');
const { eseguiAutomazioni } = require('./automazioni');
const wa = require('./whatsapp');

const db = openDb(process.env.DB_FILE || path.join(ROOT, 'data', 'pizzeria.db'), cfg);
const porta = Number(process.env.PORT || 3000);

async function ciclo() {
  try {
    const e = eseguiAutomazioni(db, cfg);
    const inv = await wa.inviaCoda(db);
    const nuovi = Object.values(e).reduce((a, b) => a + (b || 0), 0);
    if (nuovi || inv.inviati || inv.errori) console.log(new Date().toISOString(), 'automazioni', e, 'invio', inv);
  } catch (err) { console.error('Errore automazioni:', err); }
}

http.createServer(creaApp(db, cfg)).listen(porta, () => {
  console.log(`🍕 ${cfg.nomePizzeria} – sistema attivo su http://localhost:${porta}`);
  console.log(`   Configurazione: ${cfg._source} · WhatsApp: modalità ${wa.modalita()}`);
  if (!process.env.ADMIN_PIN) console.log('   ⚠️  PIN predefinito 1234: imposta ADMIN_PIN');
});
ciclo();
setInterval(ciclo, 5 * 60 * 1000);
