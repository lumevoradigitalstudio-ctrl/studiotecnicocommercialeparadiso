#!/usr/bin/env bash
# Suite completa riproducibile: unit/integrazione + RLS locale + build web + E2E + accessibilità + bundle funzioni.
set -euo pipefail
cd "$(dirname "$0")/.."
npx vitest run
npx tsc -p tsconfig.json --noEmit
(cd apps/mobile && npx tsc --noEmit && EXPO_NO_TELEMETRY=1 CI=1 npx expo export --platform web >/dev/null)
node scripts/build-functions.mjs >/dev/null
node tests/e2e/serve.mjs apps/mobile/dist 8099 & node tests/e2e/serve.mjs apps/landing 8101 & node tests/e2e/serve.mjs apps/admin 8102 &
trap 'pkill -f tests/e2e/serve.mjs || true' EXIT; sleep 1
node tests/e2e/mvp.mjs http://127.0.0.1:8099
node tests/e2e/web.mjs http://127.0.0.1:8101 http://127.0.0.1:8102
node tests/e2e/a11y.mjs http://127.0.0.1:8101 http://127.0.0.1:8102 http://127.0.0.1:8099
echo "TUTTO OK"
