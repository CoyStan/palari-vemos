# So, When?

So, When? is the tiny Palari Labs, Inc. app that turns “we should catch up sometime” into an actual plan — local-only, friends never need the app.

## Stack

- Expo (React Native) + TypeScript, Android-first
- **NativeWind** (Tailwind utility classes via `className`)
- Design tokens in `tailwind.config.js` (mirrored for JS in `src/foundation.ts`)
- On-device persistence with AsyncStorage (`sowhen.v1`)
- Typography: Quicksand · Icons: Feather (`@expo/vector-icons`)
- Optional local reminders via `expo-notifications`

## Open in Cursor

1. Read [AGENTS.md](AGENTS.md) and [docs/PRODUCT.md](docs/PRODUCT.md).
2. `npm install`
3. `npm run android` (device/emulator) or `npm run web` for layout preview.
4. After NativeWind/config changes, clear Metro: `npx expo start -c`

## App shape

Three tabs:

1. **When** — List / Week / Months; make a plan or add free time via +
2. **Friends** — people you want to see; add by typing a name
3. **Settings** — quiet reminders, defaults, privacy, feedback, export / wipe

## Styling

Prefer NativeWind `className` for UI. Keep brand colors in sync between `tailwind.config.js` and `src/foundation.ts`.

## Release

Google Play / EAS notes: [docs/PLAY_RELEASE.md](docs/PLAY_RELEASE.md). Package id: `com.palarilabs.vemos` (legacy). Publisher: Palari Labs, Inc.
