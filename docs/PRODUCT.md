# So, When? product canon

## One sentence

So, When? helps people turn “we should catch up sometime” into an actual plan — privately, on one phone.

## Core loop

Add friends → define availability → tap a free time → choose friends → share invitations → track replies → meet them.

## Language

Use **friend**, **availability**, **plan**, **invitation**, and **catch-up rhythm**. Avoid calling everything an “event.”

## Main screens (three tabs)

| Tab | Job | Primary action |
| --- | --- | --- |
| When | Next 2–3 weeks as a list, plus week/day calendar of free times and plans | Tap a free slot / FAB + |
| Friends | Grid/list of people you want to see | Add manually or from contacts |
| Settings | Reminders, defaults, privacy, export/wipe | Toggle quiet local reminders |

## Supporting flows

- Add/edit friend (manual or single-contact picker)
- Friend profile (rhythm, last met, plans)
- Add availability (presets, recurring, one-time)
- Create plan (multi-friend picker → details)
- Plan detail (editable invite text, per-friend status, share sheet)
- Move friend to another availability

## Data model (on-device only)

- **Friend**: name (required), optional photo/phone/share method, catch-up rhythm, last met
- **Availability**: recurring or one-off rule; occurrences can be skipped without deleting the rule
- **Plan**: time from availability, title/activity/place/note, friends with invite statuses
- **Settings**: notification prefs, default duration, first day of week, time format

## Invite statuses (per friend)

Not invited · Waiting · Yes · Maybe · No · New time · Moved

## Plan statuses

Draft · Waiting · It’s on · Needs another time · Done · Cancelled

## Invitations

Editable plain text; share via the OS share sheet. After sharing, ask “Mark as invited?” — the OS cannot confirm delivery.

## Explicitly not V1

No backend, accounts, social feed, chat, maps, event discovery, bulk contact sync, or auto-sent messages.

## Decision rule

If a feature makes it easier to pick a free time and invite someone this week, consider it. If it makes So, When? a social network or event directory, leave it out.
