// Genera le icone originali di RITMO (nessun asset di terzi). Uso: node scripts/make-icons.mjs
import { createRequire } from "node:module"; import path from "node:path"; import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright"); const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const BG = "#2F6B57", IVORY = "#FAF7F2", TERRA = "#C8643C";
// Un piatto (cerchio) con dentro un'onda di "ritmo"; l'accento terracotta è il punto sull'onda.
const mark = (s, cx = 512, cy = 512, r = 300) => `
 <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${IVORY}" stroke-width="${s}"/>
 <path d="M ${cx - r * .62} ${cy + 10} C ${cx - r * .42} ${cy - r * .5}, ${cx - r * .22} ${cy - r * .5}, ${cx - r * .02} ${cy + 10} S ${cx + r * .38} ${cy + r * .5}, ${cx + r * .62} ${cy - 10}" fill="none" stroke="${IVORY}" stroke-width="${s}" stroke-linecap="round"/>
 <circle cx="${cx + r * .62}" cy="${cy - 10}" r="${s * .85}" fill="${TERRA}"/>`;
const svgs = {
  "icon.png": [1024, `<rect width="1024" height="1024" fill="${BG}"/>${mark(44)}`],
  "adaptive-icon.png": [1024, `${mark(40, 512, 512, 230)}`], // trasparente: lo sfondo lo mette Android (zona sicura ~66%)
  "favicon.png": [48, `<rect width="1024" height="1024" rx="200" fill="${BG}"/>${mark(70)}`],
};
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, [size, body]] of Object.entries(svgs)) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<body style="margin:0;background:transparent">${`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`}</body>`);
  await p.screenshot({ path: path.join(out, name), omitBackground: name === "adaptive-icon.png" });
}
await b.close(); console.log("icone create in", out);
