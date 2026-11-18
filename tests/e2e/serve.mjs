// Server statico con fallback SPA per l'export web. Uso: node tests/e2e/serve.mjs <dir> <port>
import http from "node:http"; import { readFile } from "node:fs/promises"; import path from "node:path";
const [dir = "apps/mobile/dist", port = "8099"] = process.argv.slice(2);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf" };
const csp = process.env.SERVE_CSP; // facoltativo: per verificare che l'app funzioni sotto una Content-Security-Policy
const withCsp = (h) => (csp ? { ...h, "content-security-policy": csp } : h);
http.createServer(async (req, res) => {
  const p = path.join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(path.resolve(dir)) && !p.startsWith(dir)) { res.writeHead(403).end(); return; }
  try { const b = await readFile(p); res.writeHead(200, withCsp({ "content-type": types[path.extname(p)] ?? "application/octet-stream" })).end(b); }
  catch { res.writeHead(200, withCsp({ "content-type": "text/html" })).end(await readFile(path.join(dir, "index.html"))); }
}).listen(Number(port), "127.0.0.1");
