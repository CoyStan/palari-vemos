# So, When? — Android QA (Expo-adapted)

Skills used: `qa-testing-android`, `qa-testing-mobile`, `android-testing`, `eas-app-stores`, plus repo `testing-setup` / `play-policy-insights`.

Native Espresso / Compose / Roborazzi / Hilt from those skills do **not** apply 1:1 to this Expo React Native app. This plan maps the same layers to what we can run today.

## Product under test

| Item | Value |
| --- | --- |
| App | So, When? |
| Package | `com.palarilabs.vemos` |
| Stack | Expo RN + TypeScript + NativeWind |
| Data | Local-first AsyncStorage (`sowhen.v1`) |
| Backend | None in V1 |

## Quality risks (mobile skill)

| Risk | SLI / check |
| --- | --- |
| Crash on core flows | Manual smoke on release/preview APK |
| Data loss | Persist across kill; export/wipe works |
| Permission denial | Photos / notifications denied → graceful UX |
| Invite mistakes | Invite text always editable before share |
| Guilt / policy voice | No overdue scores, streaks, red guilt alerts |

## Test layers (adapted)

| Layer | Skill default | So, When? approach |
| --- | --- | --- |
| Unit | JUnit / domain | `npm run typecheck` + `npm run test:domain` |
| UI instrumented | Espresso / Compose | Manual + optional Maestro later |
| System / cross-app | UIAutomator | Manual: share sheet, notifications |
| Release | Device farm / GMD | Real phone + EAS preview APK before production |

## Device matrix (Tier 1 for V1)

| Tier | Target | When |
| --- | --- | --- |
| 1 | Physical Android phone ~360–412 dp width, API 33–35 | Every release candidate |
| 1 | Emulator Pixel-class, API 34 | Dev / PR smoke |
| 2 | Small phone (~320–360 dp) + larger phone | Before production |
| 3 | Tablet / foldable | Optional; phone-first product |

Disable animations when automating later (`adb shell settings put global …` or Gradle `animationsDisabled` after prebuild). Prefer stable `accessibilityLabel` / roles over localized copy for future Maestro/Detox.

## Critical journeys (P0)

1. **Onboarding** — welcome → add first friend + availability → land on When  
2. **Add friend** — manual name entry; optional photo  
3. **Availability** — recurring preset + one-time; skip occurrence; disable/delete rule  
4. **When** — list / week / day; tap free slot → create plan  
5. **Plan** — multi-friend, edit invite text, share, mark invited, per-friend status  
6. **Follow-through** — Done / Cancelled / move friend to another slot  
7. **Settings** — local reminders permission, calendar hours, export, wipe, privacy policy  
8. **Persistence** — force-stop app; data still present; wipe clears all  

## Permissions matrix

| Permission | Grant | Deny |
| --- | --- | --- |
| Photos | Friend / memory photo attaches | App usable without photo |
| Notifications | Local reminders can schedule | Toggle stays off; no crash |

## Offline / network

App is local-first. Confirm core flows with airplane mode on (except OS share targets that need network).

## Release readiness (from mobile skill, trimmed)

### Build and signing

- [ ] EAS preview or production AAB/APK signed  
- [ ] Version / versionCode bumped  
- [ ] Package `com.palarilabs.vemos` correct  

### Functional

- [ ] All P0 journeys on release build  
- [ ] Share sheet opens with editable invite  
- [ ] Privacy policy readable in Settings  
- [ ] Hosted privacy URL set in Play Console  

### Stability / device

- [ ] Cold start acceptable on mid-range phone  
- [ ] Tested min supported Android for Expo SDK in use  
- [ ] Phone-width layout (~360–412 dp)  

### Privacy / Play

- [ ] Data safety form matches `docs/PRIVACY_POLICY.md`  
- [ ] No analytics/ads claimed incorrectly  
- [ ] Content rating complete  

### Rollout

- [ ] Internal testing track first  
- [ ] Staged production rollout after smoke  

## Automation next steps (optional, not blocking V1)

1. Keep `npm run test:domain` as the PR unit gate.  
2. Add Maestro flows for P0 once accessibility labels are stable.  
3. After `expo prebuild`, Espresso only if you maintain a bare Android module—prefer Maestro for RN.  

## Commands

```bash
npm run typecheck
npm run test:domain
npm run android          # dev client / Expo Go
npx eas-cli@latest build --platform android --profile preview
adb devices
adb shell pm clear com.palarilabs.vemos
```

## Sign-off

| Role | Name | Date | OK |
| --- | --- | --- | --- |
| QA | | | [ ] |
| Dev | | | [ ] |
| Product | | | [ ] |
