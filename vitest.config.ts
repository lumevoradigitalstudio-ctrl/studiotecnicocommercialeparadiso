import { defineConfig } from "vitest/config";
import path from "node:path";
const r = (p: string) => path.resolve(__dirname, p);
export default defineConfig({
  resolve: { alias: {
    "@ritmo/core": r("packages/core/src/index.ts"),
    "@ritmo/nutrition": r("packages/nutrition/src/index.ts"),
    "@ritmo/ai": r("packages/ai/src/index.ts"),
  } },
  test: { include: ["packages/**/*.test.ts", "tests/**/*.test.ts"] },
});
