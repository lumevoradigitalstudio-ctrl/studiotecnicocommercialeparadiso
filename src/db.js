'use strict';
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clienti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,
  compleanno TEXT,              -- formato MM-GG
  consenso_marketing INTEGER NOT NULL DEFAULT 0,
  punti INTEGER NOT NULL DEFAULT 0,
  ritiri INTEGER NOT NULL DEFAULT 0,
  speso REAL NOT NULL DEFAULT 0,
  ultimo_ritiro TEXT,
  creato_il TEXT NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS ritiri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clienti(id),
  importo REAL NOT NULL DEFAULT 0,
  pizze INTEGER NOT NULL DEFAULT 0,
  punti INTEGER NOT NULL DEFAULT 0,
  premio_riscattato INTEGER NOT NULL DEFAULT 0,
  creato_il TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messaggi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER REFERENCES clienti(id),
  telefono TEXT NOT NULL,
  tipo TEXT NOT NULL,
  chiave TEXT NOT NULL UNIQUE,  -- evita doppioni (es. compleanno-12-2026)
  testo TEXT NOT NULL,
  stato TEXT NOT NULL DEFAULT 'da_inviare', -- da_inviare | inviato | errore | annullato
  errore TEXT,
  creato_il TEXT NOT NULL,
  inviato_il TEXT
);
CREATE TABLE IF NOT EXISTS ingredienti (
  nome TEXT PRIMARY KEY,
  scorta REAL NOT NULL DEFAULT 0,
  scorta_minima REAL NOT NULL DEFAULT 0,
  quantita_riordino REAL NOT NULL DEFAULT 0,
  fornitore TEXT,
  telefono_fornitore TEXT
);
CREATE TABLE IF NOT EXISTS chiusure (
  data TEXT PRIMARY KEY,         -- AAAA-MM-GG
  incasso REAL NOT NULL DEFAULT 0,
  ordini INTEGER NOT NULL DEFAULT 0,
  vendite TEXT NOT NULL DEFAULT '{}', -- JSON {prodotto: quantità}
  creato_il TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS esecuzioni (
  chiave TEXT PRIMARY KEY,       -- es. promo-2026-11-20
  eseguito_il TEXT NOT NULL
);
`;

function openDb(file, config) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  if (config) syncIngredienti(db, config);
  return db;
}

// Aggiunge gli ingredienti presenti in config.json senza toccare le scorte esistenti.
function syncIngredienti(db, config) {
  const ins = db.prepare(`INSERT INTO ingredienti (nome, scorta, scorta_minima, quantita_riordino, fornitore, telefono_fornitore)
    VALUES (?, 0, ?, ?, ?, ?)
    ON CONFLICT(nome) DO UPDATE SET scorta_minima = excluded.scorta_minima,
      quantita_riordino = excluded.quantita_riordino, fornitore = excluded.fornitore,
      telefono_fornitore = excluded.telefono_fornitore`);
  for (const i of config.ingredienti || []) {
    ins.run(i.nome, i.scortaMinima || 0, i.quantitaRiordino || 0, i.fornitore || '', i.telefonoFornitore || '');
  }
}

module.exports = { openDb };
