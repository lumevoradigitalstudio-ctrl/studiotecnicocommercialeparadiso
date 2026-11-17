'use strict';
// Invio messaggi WhatsApp.
// - Modalità AUTOMATICA: se sono impostati WHATSAPP_TOKEN e WHATSAPP_PHONE_ID (WhatsApp Business Cloud API di Meta)
//   i messaggi in coda partono da soli.
// - Modalità MANUALE (predefinita): i messaggi restano in coda nel pannello e si inviano con un clic (link wa.me).

function modalita() {
  return process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID ? 'automatica' : 'manuale';
}

function linkWaMe(telefono, testo) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(testo)}`;
}

async function inviaCloudApi(telefono, testo) {
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: telefono, type: 'text', text: { body: testo } }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function inviaCoda(db, { invia = inviaCloudApi, limite = 50 } = {}) {
  if (modalita() !== 'automatica' && invia === inviaCloudApi) return { inviati: 0, errori: 0 };
  const coda = db.prepare("SELECT * FROM messaggi WHERE stato = 'da_inviare' ORDER BY id LIMIT ?").all(limite);
  let inviati = 0; let errori = 0;
  for (const m of coda) {
    try {
      await invia(m.telefono, m.testo);
      db.prepare("UPDATE messaggi SET stato = 'inviato', inviato_il = ?, errore = NULL WHERE id = ?").run(new Date().toISOString(), m.id);
      inviati++;
    } catch (e) {
      db.prepare("UPDATE messaggi SET stato = 'errore', errore = ? WHERE id = ?").run(String(e.message).slice(0, 500), m.id);
      errori++;
    }
  }
  return { inviati, errori };
}

module.exports = { modalita, linkWaMe, inviaCoda };
