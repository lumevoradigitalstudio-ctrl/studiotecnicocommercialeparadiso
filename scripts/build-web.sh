#!/usr/bin/env bash
# Build dell'app web in apps/mobile/dist. Senza variabili → modalità DEMO locale (nessun backend).
# Con EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY → modalità con backend (login reale). Sono valori PUBBLICI.
set -euo pipefail
cd "$(dirname "$0")/.."
npm install --no-audit --no-fund
(cd apps/mobile && npm install --legacy-peer-deps --no-audit --no-fund && EXPO_NO_TELEMETRY=1 CI=1 npx expo export --platform web)
test -f apps/mobile/dist/_headers && test -f apps/mobile/dist/_redirects && echo "build ok: apps/mobile/dist (con _headers/_redirects)"
