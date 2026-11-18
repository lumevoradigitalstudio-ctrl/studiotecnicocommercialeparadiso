# Come ottenere l'APK (non generabile dalla sessione cloud)
**Perché non c'è già:** per costruire un APK servono l'Android SDK (qui assente e il download da `dl.google.com` è bloccato) oppure EAS Build, che richiede un tuo account Expo (`api.expo.dev` è bloccato dal proxy e il login lo fai tu). Nessuna chiave di firma è stata creata. Non ho mai compilato l'app per Android: finora è verificata solo la versione web.

## Via più semplice: EAS Build (build nel cloud Expo, piano gratuito con coda; limiti da verificare)
Dal tuo computer (Node 22):
```bash
git clone <repo> && cd <repo> && git checkout ccr-87348f8d-uziqaj
npm install && cd apps/mobile && npm install --legacy-peer-deps
npm install -g eas-cli
eas login                         # account Expo (gratuito)
eas build:configure               # prima volta: collega il progetto
eas build -p android --profile preview   # produce un .apk scaricabile (link a fine build)
```
Poi installi l'APK sul telefono Android (abilita «installa da origini sconosciute»). Il profilo `preview` in `apps/mobile/eas.json` crea APK per test interni; `production` crea l'AAB richiesto da Google Play.

## Cosa aspettarti
- L'APK conterrà la stessa app: assistente **DEMO** e dati **solo sul telefono** (senza variabili `EXPO_PUBLIC_*`). Per il backend vedi `docs/deploy-web.md`.
- Gli acquisti (RevenueCat) **non** sono nell'APK: l'SDK non è ancora integrato.
- Possibili problemi al primo build nativo che non posso prevedere (permessi, icone, versioni): la prima compilazione reale è anche il primo test su Android.
- `android.package` è `app.ritmo.dev` (provvisorio): cambialo prima della prima pubblicazione, perché poi è l'identità dell'app su Google Play. Icona e splash: non ancora create.
