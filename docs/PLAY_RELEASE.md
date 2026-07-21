# Fast path to Google Play

## Already prepared

- Expo managed app **So, When?** by **Palari Labs, Inc.**
- Android package `com.palarilabs.vemos` (legacy id — change only if Play Console rejects it).
- Brand assets in `assets/` (app icon, adaptive icons, splash, store icon, feature graphic).
- eas.json with internal preview and production profiles.
- Android-first scope, visual rules, and quality gate in AGENTS.md.

## Brand assets for Play Console

| File | Use |
| --- | --- |
| `assets/store-icon-512.png` | Play Store high-res icon (512×512) |
| `assets/store-feature-graphic.png` | Feature graphic (1024×500) |
| `assets/icon.png` | App icon source (1024×1024) |
| `assets/android-icon-*.png` | Adaptive icon layers |

Wordmark: teal **So,** stacked above ink **When?** in Quicksand Bold on warm canvas.

## Before first internal test

1. Confirm MVP quality gate in AGENTS.md on a real Android phone.
2. Host `docs/PRIVACY_POLICY.md` at a public HTTPS URL and paste it into Play Console. The same policy is readable in-app under Settings → Privacy policy.
3. Log into the Expo account Palari Labs, Inc. will own.
4. Run: `npx eas-cli@latest build --platform android --profile preview`
5. Install the APK and complete the Android quality gate.

## Production upload

1. Create **So, When?** in Google Play Console under Palari Labs, Inc.
2. Complete Store Listing, App Content, Data safety, content rating, and privacy-policy requirements based on the real app behavior.
3. Run: `npx eas-cli@latest build --platform android --profile production`
4. Run: `npx eas-cli@latest submit --platform android --profile production`
5. Start in the internal track, then promote only after testing and automated checks pass.

Do not claim no data collected if analytics, crash reporting, accounts, contact import, or remote services are introduced later. Update Play forms and the privacy policy with every data-flow change.
