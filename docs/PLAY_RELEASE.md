# Fast path to Google Play

## Already prepared

- Expo managed app with Android package com.palarilabs.vemos.
- eas.json with internal preview and production profiles.
- Android-first scope, visual rules, and quality gate in AGENTS.md.

## Before first internal test

1. Finish the six MVP screens in PRODUCT.md.
2. Replace the Expo starter icon, adaptive icon, and splash art with final Vemos assets.
3. Log into the Expo account Palari Labs will own.
4. Run: npx eas-cli@latest build --platform android --profile preview
5. Install the APK and complete the Android quality gate in AGENTS.md.

## Production upload

1. Create Vemos in Google Play Console under Palari Labs.
2. Complete Store Listing, App Content, Data safety, content rating, and privacy-policy requirements based on the real app behavior.
3. Run: npx eas-cli@latest build --platform android --profile production
4. Run: npx eas-cli@latest submit --platform android --profile production
5. Start in the internal track, then promote only after testing and automated checks pass.

Do not claim no data collected if analytics, crash reporting, accounts, contact import, or remote services are introduced later. Update Play forms and the privacy policy with every data-flow change.
