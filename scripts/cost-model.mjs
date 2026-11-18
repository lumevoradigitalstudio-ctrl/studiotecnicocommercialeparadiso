// Modello unit economics — TUTTI i parametri sono ASSUNZIONI da validare (vedi docs/cost-model.md).
const A = { vat: 0.22, storeFee: 0.15, priceMonthly: 9.9, priceYearly: 69, yearlyMix: 0.7, conv: 0.03,
  aiCostPerMsg: 0.004, freeMsgsPerMonth: 15, plusMsgsPerMonth: 120, fixedPerMonth: 60 /* hosting/monitoraggio base, assunto */, supportPerPayer: 0.3 };
const netMonthlyPerPayer = (A.yearlyMix * (A.priceYearly / 12) + (1 - A.yearlyMix) * A.priceMonthly) / (1 + A.vat) * (1 - A.storeFee);
const rows = [100, 1000, 5000, 10000, 50000].map(n => {
  const payers = Math.round(n * A.conv), free = n - payers;
  const rev = payers * netMonthlyPerPayer;
  const ai = free * A.freeMsgsPerMonth * A.aiCostPerMsg + payers * A.plusMsgsPerMonth * A.aiCostPerMsg;
  const costs = ai + A.fixedPerMonth * Math.max(1, Math.ceil(n / 10000)) + payers * A.supportPerPayer;
  return { utenti: n, paganti: payers, "ricavo netto €/mese": +rev.toFixed(0), "costo AI €/mese": +ai.toFixed(0), "costi totali €/mese": +costs.toFixed(0), "margine €/mese": +(rev - costs).toFixed(0) };
});
console.log("netto per pagante/mese €", netMonthlyPerPayer.toFixed(2), "| costo AI max Plus (500 msg) €", (500 * A.aiCostPerMsg).toFixed(2));
console.table(rows);
