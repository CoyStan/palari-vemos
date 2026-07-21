# Vemos — build brief

## Product

Vemos is Palari Labs' deliberately small app for helping people actually see the friends they mean to see.

> Turn “we should catch up sometime” into a real invitation in a few taps.

Friends do not need Vemos. The owner adds a small circle of people, chooses a loose rhythm, receives one gentle suggestion, and shares an invitation with the phone's normal share sheet.

## Build for the first Google Play release

- Expo-managed React Native app, TypeScript, Android-first.
- Package id: com.palarilabs.vemos. Change only if Play Console rejects it.
- Start with npm install, then npm run android.
- Keep the first release local-first: no account, backend, OAuth, payments, analytics, or remote database without an explicit decision.
- Use Expo modules and the native share sheet. Do not build a messaging system.
- Keep friend data on-device. Do not import contacts in version 0.1.

## MVP scope — build in this order

1. Tiny onboarding and manual add-first-friend flow.
2. Friends: name, optional note, contact method, priority to meet (1–5), last-met date.
3. Free times: recurring weekly blocks plus one-off dated blocks.
4. Calendar (main tab): week + hour grid; tap a free block → pick a friend (priority-sorted).
5. Editable invitation for that slot; share via the native share sheet.
6. Invitation status: to send, sent, accepted, canceled, moved (owner-tracked).

## Explicitly not version 0.1

- Social feed, chat, follower graph, streaks, leaderboards, scores, or relationship-health dashboards.
- Event scraping, ticketing, maps, recommendation AI, calendar OAuth, contact syncing, groups, or push notifications.
- Generic event discovery. Events are an optional excuse; friendship is the product.

## UX and voice

- Warm, low-pressure, and specific. Say “Want to invite Ana?” not “Ana is overdue.”
- Never shame users for elapsed time: no red alerts, rankings, scores, or countdowns.
- Make the next action singular and easy. An invitation should take two taps from the suggestion.
- Always let the owner edit an invitation before sharing.
- Use at least 44 by 44 point touch targets, respect font scaling, and label icon-only controls.

## Visual language

Vemos is a warm consumer sibling of Palari, not a copy of the company console. Use src/foundation.ts: quiet blue-gray canvas, white surfaces, deep slate type, restrained teal action, and soft coral only for warmth. Prefer generous whitespace, open lists, and one focused plan card.

The target home-screen mood and hierarchy are in docs/reference/vemos-home-concept.png. Use it as reference, never as a static screen to ship.

Avoid dense dashboards, bento grids, gradients, floating metric pills, notification counts, stock-avatar walls, and fake activity.

## Code and quality rules

- Keep App.tsx as composition glue; add focused screens and reusable primitives below src.
- Keep domain models, seed data, persistence, and UI separate.
- Create useful empty, loading, and error states. A first run must not lead to a dead blank screen.
- Prefer Expo SDK and React Native APIs. Add dependencies only when a real screen needs them.
- Never commit secrets, keystores, node_modules, build output, or personal friend data.
- Before an Android build, run npm run typecheck and test onboarding, adding a friend, sharing, snoozing, and marking Met up.
- Before production, replace starter icon/splash art and complete Play Data safety, privacy policy, content rating, and listing requirements.
