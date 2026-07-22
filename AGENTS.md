# So, When? — build brief

## Product

So, When? is Palari Labs, Inc.'s deliberately small Android app for turning “we should catch up sometime” into an actual plan.

Friends do not need So, When?, an account, or an invitation link. Version 1 is an organizer for the person using the app—not a new social network.

## Build for the first Google Play release

- Expo-managed React Native app, TypeScript, Android-first.
- Package id: `com.palarilabs.vemos`. Change only if Play Console rejects it.
- Start with `npm install`, then `npm run android`.
- Keep the first release local-first: no account, backend, OAuth, payments, analytics, or remote database without an explicit decision.
- Use Expo modules and the native share sheet. Do not build a messaging system.
- Keep friend data on-device. Prefer the native contact picker for a **single** contact — never scan or upload the address book.

## MVP scope — build in this order

1. Tiny onboarding and add-first-friend (manual + contact picker).
2. Friends: name, optional photo/phone/share method, catch-up rhythm, last-seen date.
3. When: chronological next 2–3 weeks — availability, plans, friends due for a catch-up.
4. Availability: recurring presets + one-time; skip occurrence without changing the rule.
5. Plan: multi-friend picker (from a free slot **or** a one-off date/time), activity/place/note, editable invite text, native share.
6. Follow-through: per-friend statuses, plan Done/Cancelled, move to another time.
7. Settings: quiet local reminders, defaults, privacy, export, wipe, feedback.

## Explicitly not version 1

- Social feed, chat, follower graph, streaks, leaderboards, scores, or relationship-health dashboards.
- Event scraping, ticketing, maps, recommendation AI, calendar OAuth, bulk contact syncing, groups, or remote push.
- Generic event discovery. Friendship is the product.

## UX and voice

- Warm, low-pressure, and specific. Say “Want to invite Ana?” not “Ana is overdue.”
- Catch-up labels may show Due / Soon / No schedule, but never shame with red guilt alerts or rankings.
- Make the next action singular and easy. Always let the owner edit an invitation before sharing.
- Use at least 44 by 44 point touch targets, respect font scaling, and label icon-only controls.

## Visual language

Use `src/foundation.ts`: warm off-white canvas, white surfaces with soft teal-tinted shadows, deep slate type, restrained teal action, and soft coral only for warmth. Prefer generous whitespace and one focused plan card.

Standard primitives below `src/components`: `Card` (surface + soft shadow), `PressableScale` (calm 0.97 press), `AnimatedDialog` (bottom sheets — use instead of raw `Modal`/`Alert`), `ScreenTransition` (screen entry motion), `Button` (pill primary), `Screen`/`ScreenHeader`, `Avatar`, `TextField`, `ChoiceRow`.

Avoid dense dashboards, bento grids, gradients, floating metric pills, notification counts, and fake activity.

## Code and quality rules

- Keep `App.tsx` as composition glue; add focused screens and reusable primitives below `src`.
- Keep domain models, seed data, persistence, and UI separate.
- Navigation lives in `src/state/AppProvider.tsx` as a back stack: `open*` pushes, `goBack()` pops, `goWhen/goFriends/goSettings` reset to a tab root. Screens use `goBack()` for back arrows; Android hardware back is wired.
- Create useful empty, loading, and error states.
- Prefer Expo SDK and React Native APIs. Add dependencies only when a real screen needs them.
- Never commit secrets, keystores, `node_modules`, build output, or personal friend data.
- Before an Android build, run `npm run typecheck` and test onboarding, adding a friend (manual + picker), sharing, statuses, and marking Done.
- Before production, replace starter icon/splash art and complete Play Data safety, privacy policy, content rating, and listing requirements.
