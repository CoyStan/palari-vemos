# Fast path to Google Play

## Already prepared

- Expo managed app **So, When?** by **Palari Labs, Inc.**
- Android package `com.sowhen.myapp` (must match Google Play Console).
- Brand assets in `assets/` (app icon, adaptive icons, splash, store icon, feature graphic).
- eas.json with internal preview and production profiles (**no EAS projectId/owner invented in-repo**).
- Android-first scope, visual rules, and quality gate in AGENTS.md.
- **Pinned EAS CLI:** `eas-cli@16.32.0` (same major pin as `eas.json` `cli.version`: `>= 16.32.0 < 17.0.0`).

## EAS project (manual — requires Expo login)

Do **not** invent an EAS `projectId` or `owner` in `app.json`. Under the Palari Expo organization account, run authenticated:

```bash
npx eas-cli@16.32.0 login
npx eas-cli@16.32.0 init
```

Link the existing app to the Palari org project, then:

```bash
npx eas-cli@16.32.0 build --platform android --profile preview
```

## Privacy policy hosting (manual)

1. Host `docs/privacy-policy.html` (same body as `docs/PRIVACY_POLICY.md` / in-app copy) at a public HTTPS URL.
2. Paste that URL into Google Play Console → App content → Privacy policy.
3. Keep deployment notes **here only** — not in the in-app or public-facing policy body.
4. CI runs `npm run check:privacy` so Markdown/HTML stay in sync with `src/content/privacyPolicy.ts`.

## Brand assets for Play Console

| File | Use |
| --- | --- |
| `assets/store-icon-512.png` | Play Store high-res icon (512×512) |
| `assets/store-feature-graphic.png` | Feature graphic (1024×500) |
| `assets/icon.png` | App icon source (1024×1024) |
| `assets/android-icon-*.png` | Adaptive icon layers |

Wordmark: teal **So,** stacked above ink **When?** in Quicksand Bold on warm canvas.

## Contact permission release blocker

`expo prebuild` currently emits **`android.permission.READ_CONTACTS`** (from `expo-contacts`) while WRITE_CONTACTS / media / camera are removed via `blockedPermissions`.

Single-contact `Contact.presentPicker()` is still used, with a pre-permission explanation and runtime permission handling in onboarding and friend forms. Until Play Data safety + the privacy policy can honestly describe that permission (or Expo proves picker-only without READ_CONTACTS on target API levels), treat **READ_CONTACTS as an explicit release blocker** — do not remove contact import silently.

## Preview APK test checklist (physical Android)

Before calling an internal release ready, install the preview APK and verify:

- [ ] Fresh install → welcome/onboarding
- [ ] Upgrade from previous install → data loads (or recovery if corrupt)
- [ ] Add friend manually
- [ ] Contact picker (single contact) → pre-permission copy → name/phone; photo optional; cancel / deny → manual fallback
- [ ] Gallery friend photo + contact photo + plan memory photo survive **relaunch**
- [ ] Process death (force-stop) → state restored from primary/backup
- [ ] Invitation share sheet; edit text; Yes/Maybe/No preserved when dismissing send confirm
- [ ] JSON export share and **cancel** (temp file cleaned)
- [ ] Local reminders (permission on/off, settings toggles; foreground after a fired one-shot)
- [ ] Forced save failure → banner Retry resaves latest (does not wipe)
- [ ] Reminder API failure → separate banner (does not look like a save failure)
- [ ] Wipe all data → empty welcome; Retry wipe if wipe failed (does not resave old snapshot)
- [ ] Recovery Start Fresh → confirm; failure surfaces as start-fresh error, not save error

## Production upload

1. Create **So, When?** in Google Play Console under Palari Labs, Inc.
2. Complete Store Listing, App Content, Data safety, content rating, and privacy-policy requirements based on the real app behavior.
3. Run: `npx eas-cli@16.32.0 build --platform android --profile production`
4. Run: `npx eas-cli@16.32.0 submit --platform android --profile production`
5. Start in the internal track, then promote only after testing and automated checks pass.

Do not claim no data collected if analytics, crash reporting, accounts, contact import, or remote services are introduced later. Update Play forms and the privacy policy with every data-flow change.
