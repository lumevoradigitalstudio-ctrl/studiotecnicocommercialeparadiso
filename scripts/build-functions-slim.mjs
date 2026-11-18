// Bundle "slim" per il deploy via MCP: zod e supabase-js come import npm: (risolti da Deno), codice minificato.
import { build } from "esbuild"; import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
for (const fn of process.argv.slice(2)) {
  await build({ entryPoints: [`${root}/supabase/functions/${fn}/index.ts`], outfile: `${root}/supabase/functions/_build/${fn}.slim.js`, bundle: true, format: "esm", platform: "neutral", target: "es2022",
    external: ["npm:*"], alias: { "@ritmo/core": `${root}/packages/core/src/index.ts`, zod: "npm:zod@3.25.76" }, minify: true, logLevel: "warning" });
}
