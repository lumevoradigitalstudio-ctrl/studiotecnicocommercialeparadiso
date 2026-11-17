'use strict';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => `${Number(n || 0).toFixed(2).replace('.', ',')} €`;
const dataIt = (iso) => (iso ? new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }) : '—');

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fbf7f2;color:#2a211c}
header{background:#b3261e;color:#fff;padding:12px 16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
header b{font-size:18px;margin-right:auto}header a{color:#fff;text-decoration:none;font-weight:600;font-size:15px}
main{max-width:980px;margin:0 auto;padding:16px}h1{font-size:22px;margin:8px 0 16px}h2{font-size:18px;margin:24px 0 8px}
.card{background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:16px}
.griglia{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.kpi{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.kpi small{color:#6b5d55;display:block}.kpi b{font-size:26px}
label{display:block;font-weight:600;margin:10px 0 4px}input,select,textarea{width:100%;padding:10px;font-size:16px;border:1px solid #d6cbc3;border-radius:8px;background:#fff}
input[type=checkbox]{width:auto;margin-right:8px}button,.btn{display:inline-block;background:#b3261e;color:#fff;border:0;border-radius:8px;padding:11px 16px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none;margin-top:10px}
.btn.verde{background:#1f7a3a}.btn.grigio{background:#8a7d75}.btn.piccolo{padding:6px 10px;font-size:14px;margin:2px}
table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:14px;vertical-align:top}
.ok{background:#e6f4ea;color:#1f5e2f;padding:10px;border-radius:8px}.err{background:#fde8e7;color:#8c1d18;padding:10px;border-radius:8px}
.nota{color:#6b5d55;font-size:14px}.badge{display:inline-block;padding:2px 8px;border-radius:99px;background:#eee;font-size:12px}.rosso{background:#fde8e7;color:#8c1d18}
pre{white-space:pre-wrap;background:#fff;padding:12px;border-radius:8px;font-family:inherit}
@media print{header,.noprint{display:none}body{background:#fff}}
`;

function pagina(titolo, corpo, { admin = false, cfg } = {}) {
  const nav = admin ? `<header><b>🍕 ${esc(cfg.nomePizzeria)}</b>
    <a href="/admin">Riepilogo</a><a href="/admin/cassa">Cassa</a><a href="/admin/clienti">Clienti</a>
    <a href="/admin/messaggi">Messaggi</a><a href="/admin/magazzino">Magazzino</a><a href="/admin/qr">QR</a><a href="/admin/esci">Esci</a></header>`
    : `<header><b>🍕 ${esc(cfg.nomePizzeria)}</b></header>`;
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titolo)} – ${esc(cfg.nomePizzeria)}</title><style>${CSS}</style></head><body>${nav}<main>${corpo}</main></body></html>`;
}

const avviso = (q) => (q.ok ? `<p class="ok">${esc(q.ok)}</p>` : '') + (q.err ? `<p class="err">${esc(q.err)}</p>` : '');

module.exports = { esc, euro, dataIt, pagina, avviso };
