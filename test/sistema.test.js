'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');
const { openDb } = require('../src/db');
const core = require('../src/core');
const { eseguiAutomazioni } = require('../src/automazioni');

const cfg = loadConfig(require('node:path').join(__dirname, '..', 'config.example.json'));
const nuovoDb = () => openDb(':memory:', cfg);
const msg = (db, tipo) => db.prepare('SELECT * FROM messaggi WHERE tipo = ?').all(tipo);
// Venerdì 20 novembre 2026, ore 17:30 a Roma (16:30 UTC)
const VENERDI_17 = new Date('2026-11-20T16:30:00Z');

test('normalizza i numeri italiani', () => {
  assert.strictEqual(core.normalizzaTelefono('333 123 4567'), '393331234567');
  assert.strictEqual(core.normalizzaTelefono('+39 333-1234567'), '393331234567');
  assert.strictEqual(core.normalizzaTelefono('0039 3331234567'), '393331234567');
  assert.strictEqual(core.normalizzaTelefono('123'), null);
  assert.strictEqual(core.normalizzaCompleanno('1990-03-07'), '03-07');
  assert.strictEqual(core.normalizzaCompleanno('7/3'), '03-07');
});

test('iscrizione: benvenuto solo con consenso, nessun doppione', () => {
  const db = nuovoDb();
  core.registraCliente(db, cfg, { nome: 'Mario Rossi', telefono: '3331234567', consenso: true });
  core.registraCliente(db, cfg, { nome: 'Mario Rossi', telefono: '+39 333 1234567', consenso: true });
  core.registraCliente(db, cfg, { nome: 'Luca', telefono: '3339999999', consenso: false });
  assert.strictEqual(db.prepare('SELECT COUNT(*) n FROM clienti').get().n, 2);
  const b = msg(db, 'benvenuto');
  assert.strictEqual(b.length, 1);
  assert.match(b[0].testo, /Mario/);
});

test('punti, premio sbloccato e riscatto', () => {
  const db = nuovoDb();
  core.registraCliente(db, cfg, { nome: 'Anna', telefono: '3331112222', consenso: true });
  let r = core.registraRitiro(db, cfg, { telefono: '3331112222', pizze: 6, importo: '42,00' });
  assert.strictEqual(r.cliente.punti, 6);
  assert.strictEqual(r.premioSbloccato, false);
  r = core.registraRitiro(db, cfg, { telefono: '3331112222', pizze: 4, importo: 30 });
  assert.strictEqual(r.cliente.punti, 10);
  assert.strictEqual(r.premioSbloccato, true);
  assert.strictEqual(msg(db, 'premio').length, 1);
  r = core.registraRitiro(db, cfg, { telefono: '3331112222', pizze: 2, importo: 12, riscattaPremio: true });
  assert.strictEqual(r.cliente.punti, 2);
  assert.strictEqual(r.cliente.speso, 84);
  assert.throws(() => core.registraRitiro(db, cfg, { telefono: '3331112222', pizze: 1, riscattaPremio: true }), /insufficienti/);
});

test('recensione chiesta dopo il ritiro, una sola volta', () => {
  const db = nuovoDb();
  core.registraCliente(db, cfg, { nome: 'Gino', telefono: '3330000001', consenso: true });
  const ritiro = new Date('2026-11-17T19:00:00Z');
  core.registraRitiro(db, cfg, { telefono: '3330000001', pizze: 2, importo: 15 }, ritiro);
  eseguiAutomazioni(db, cfg, new Date('2026-11-17T19:30:00Z'));
  assert.strictEqual(msg(db, 'recensione').length, 0, 'troppo presto');
  eseguiAutomazioni(db, cfg, new Date('2026-11-17T20:30:00Z'));
  core.registraRitiro(db, cfg, { telefono: '3330000001', pizze: 1, importo: 7 }, new Date('2026-11-18T19:00:00Z'));
  eseguiAutomazioni(db, cfg, new Date('2026-11-18T21:00:00Z'));
  assert.strictEqual(msg(db, 'recensione').length, 1);
});

test('promo del venerdì: una volta, solo con consenso', () => {
  const db = nuovoDb();
  core.registraCliente(db, cfg, { nome: 'A', telefono: '3330000011', consenso: true });
  core.registraCliente(db, cfg, { nome: 'B', telefono: '3330000012', consenso: false });
  eseguiAutomazioni(db, cfg, VENERDI_17);
  eseguiAutomazioni(db, cfg, new Date(VENERDI_17.getTime() + 30 * 60000));
  const p = msg(db, 'promo_settimanale');
  assert.strictEqual(p.length, 1);
  assert.strictEqual(p[0].telefono, '393330000011');
  assert.match(p[0].testo, /link-della-tua-app/);
});

test('clienti persi e anti-spam', () => {
  const db = nuovoDb();
  core.registraCliente(db, cfg, { nome: 'Vecchio', telefono: '3330000021', consenso: true }, new Date('2026-09-01T10:00:00Z'));
  core.registraRitiro(db, cfg, { telefono: '3330000021', pizze: 1, importo: 7 }, new Date('2026-10-01T19:00:00Z'));
  core.registraCliente(db, cfg, { nome: 'Fedele', telefono: '3330000022', consenso: true }, new Date('2026-09-01T10:00:00Z'));
  core.registraRitiro(db, cfg, { telefono: '3330000022', pizze: 1, importo: 7 }, new Date('2026-11-15T19:00:00Z'));
  const martedi11 = new Date('2026-11-17T10:00:00Z'); // martedì, ore 11 a Roma
  eseguiAutomazioni(db, cfg, martedi11);
  const persi = msg(db, 'clienti_persi');
  assert.strictEqual(persi.length, 1);
  assert.match(persi[0].testo, /Vecchio/);
  // Il giorno lento (martedì ore 16) non deve rimandare una promo a chi l'ha appena ricevuta
  eseguiAutomazioni(db, cfg, new Date('2026-11-17T15:10:00Z'));
  const lenti = msg(db, 'giorni_lenti');
  assert.deepStrictEqual(lenti.map((m) => m.telefono), ['393330000022']);
});

test('compleanno una volta all\'anno', () => {
  const db = nuovoDb();
  core.registraCliente(db, cfg, { nome: 'Sara', telefono: '3330000031', compleanno: '1995-11-20', consenso: true });
  eseguiAutomazioni(db, cfg, VENERDI_17);
  eseguiAutomazioni(db, cfg, new Date(VENERDI_17.getTime() + 3600000));
  assert.strictEqual(msg(db, 'compleanno').length, 1);
});

test('chiusura serale scala il magazzino e il report segnala le scorte basse', () => {
  const db = nuovoDb();
  db.prepare("UPDATE ingredienti SET scorta = 100 WHERE nome = 'Impasto (panetto)'").run();
  db.prepare("UPDATE ingredienti SET scorta = 12 WHERE nome = 'Fior di latte (kg)'").run();
  const sera = new Date('2026-11-17T21:30:00Z');
  core.chiusuraSerale(db, cfg, { incasso: '850,50', ordini: 40, vendite: { Margherita: 30, 'Box Famiglia': 5 } }, sera);
  const s = (n) => db.prepare('SELECT scorta FROM ingredienti WHERE nome = ?').get(n).scorta;
  assert.strictEqual(s('Impasto (panetto)'), 50);
  assert.strictEqual(s('Fior di latte (kg)'), 6);
  // Rifare la chiusura non deve scalare due volte
  core.chiusuraSerale(db, cfg, { incasso: 850.5, ordini: 40, vendite: { Margherita: 30, 'Box Famiglia': 5 } }, sera);
  assert.strictEqual(s('Impasto (panetto)'), 50);
  eseguiAutomazioni(db, cfg, new Date('2026-11-17T22:05:00Z'));
  const rep = msg(db, 'report');
  assert.strictEqual(rep.length, 1);
  assert.match(rep[0].testo, /850\.50/);
  assert.match(rep[0].testo, /Scorte basse/);
  assert.match(rep[0].testo, /Ordine pronto per i fornitori/);
});
