'use strict';
// Genera i materiali stampabili (volantino A5 + adesivi per il cartone) con il QR della tessera.
const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
const { loadConfig, ROOT } = require('../src/config');
const { esc } = require('../src/viste');

(async () => {
  const cfg = loadConfig();
  const url = `${cfg.urlPubblico.replace(/\/$/, '')}/iscriviti`;
  const qr = await QRCode.toString(url, { type: 'svg', margin: 1, width: 300 });
  const nome = esc(cfg.nomePizzeria);
  const T = cfg.tessera;
  const css = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,Arial,sans-serif;color:#2a211c}
  .pag{width:148mm;height:210mm;padding:8mm;overflow:hidden;border:1px dashed #ccc;display:inline-block;vertical-align:top;text-align:center;page-break-after:always}
  h1{color:#b3261e;font-size:30pt;margin:0 0 4mm}h2{font-size:18pt;margin:4mm 0}.grande{font-size:22pt;font-weight:800}
  .box{background:#fff3e0;border-radius:6mm;padding:4mm;margin:3mm 0;font-size:15pt}.qr{width:48mm;margin:2mm auto}
  .adesivi{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;padding:8mm;width:210mm}
  .ad{border:1px dashed #999;border-radius:50%;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6mm;font-size:10pt}
  .ad .qr{width:32mm;margin:1mm}.ad b{color:#b3261e;font-size:12pt}
  .qr svg{width:100%;height:auto;display:block}
  @media print{.pag{border:0}}`;
  const volantino = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Volantino ${nome}</title><style>${css}</style></head><body>
  <div class="pag"><h1>🍕 ${nome}</h1><p class="grande">Pizza d'asporto<br>senza fare la fila</p>
  <div class="box"><b>La prima pizza?</b><br>Porta questo volantino:<br><b>${esc(T.regaloBenvenuto)}</b></div>
  <h2>Tessera punti gratis</h2><p>Ogni pizza = 1 punto.<br><b>${T.puntiPerPremio} punti = ${esc(T.premio)}</b></p>
  <div class="qr">${qr}</div><p>Inquadra e attiva la tessera in 20 secondi</p>
  <p><b>Ordina dall'app:</b> ${esc(cfg.linkApp)}<br>${esc(cfg.indirizzo)}</p></div>
  <div class="pag"><h1>Feste e squadre?</h1><p class="grande">15–30 pizze,<br>pronte all'orario che vuoi</p>
  <div class="box">✔ Sconto fisso per squadre, palestre e uffici<br>✔ Ordine una volta sola, ritiro tutto insieme<br>✔ Preventivo in 10 minuti</div>
  <p class="grande">Scrivici su WhatsApp</p><p style="font-size:20pt">📱 ${esc(cfg.telefonoTitolare)}</p><p>${nome}<br>${esc(cfg.indirizzo)}</p></div>
  </body></html>`;
  const ad = `<div class="ad"><b>🎟️ ${nome}</b>Tessera punti gratis<div class="qr">${qr}</div>${T.puntiPerPremio} pizze = ${esc(T.premio)}</div>`;
  const adesivi = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Adesivi cartone</title><style>${css}</style></head><body><div class="adesivi">${ad.repeat(12)}</div></body></html>`;
  fs.mkdirSync(path.join(ROOT, 'materiali'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'materiali', 'volantino.html'), volantino);
  fs.writeFileSync(path.join(ROOT, 'materiali', 'adesivi-cartone.html'), adesivi);
  console.log('Creati: materiali/volantino.html e materiali/adesivi-cartone.html (QR →', url + ')');
})();
