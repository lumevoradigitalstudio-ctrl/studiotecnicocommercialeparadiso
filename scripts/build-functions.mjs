// Bundla ogni Edge Function in un singolo file (supabase/functions/_build/*.js) risolvendo zod e i package del monorepo.
import { build } from "esbuild"; import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
for (const fn of ["ritmo-chat", "delete-account"]) {
  await build({ entryPoints: [`${root}/supabase/functions/${fn}/index.ts`], outfile: `${root}/supabase/functions/_build/${fn}.js`, bundle: true, format: "esm", platform: "neutral", target: "es2022",
    external: ["npm:*"], alias: { "@ritmo/core": `${root}/packages/core/src/index.ts` }, minify: false, logLevel: "info" });
}
