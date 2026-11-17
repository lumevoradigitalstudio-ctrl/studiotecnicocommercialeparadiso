'use strict';
// Utility per date nel fuso orario della pizzeria (default Europe/Rome).

function partiLocali(date, tz) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz || 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const giorni = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    anno: p.year, mese: p.month, giorno: p.day,
    ora: Number(p.hour), minuto: Number(p.minute),
    giornoSettimana: giorni[p.weekday],
    data: `${p.year}-${p.month}-${p.day}`,
    meseGiorno: `${p.month}-${p.day}`,
  };
}

const GIORNO_MS = 24 * 60 * 60 * 1000;
const giorniFa = (now, n) => new Date(now.getTime() - n * GIORNO_MS).toISOString();
const oreFa = (now, n) => new Date(now.getTime() - n * 60 * 60 * 1000).toISOString();

module.exports = { partiLocali, giorniFa, oreFa, GIORNO_MS };
