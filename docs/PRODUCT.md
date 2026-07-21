# Vemos product canon

## One sentence

Vemos makes it easy to turn free time into a real catch-up with the friends you mean to see.

## Core loop

Add friends (with priority) → mark free times (weekly + one-off) → tap a free slot on the week calendar → pick a friend → edit and share an invitation → update status (sent / accepted / canceled / moved).

## First-release screens

| Screen | Job | Primary action |
| --- | --- | --- |
| Welcome | Explain the promise in one breath | Add first friend |
| Calendar | Week + hour grid of free time and invites | Tap free block |
| Free times | Manage recurring and one-off availability | Add free time |
| Pick friend | Choose who to invite (priority-sorted) | Create invitation |
| Invite detail | Edit message and track status | Share / accept / move / cancel |
| Friends | Last met + priority | Add / edit friend |

## Data model

Friend: id, name, optional note, contact method, priority (1–5), last-met date, created date.

Free block: recurring (day of week + start/end minutes) or one-off (date + start/end minutes).

Invitation: friend id, start/end, idea, place, editable invitation text, status (`to_send` | `sent` | `accepted` | `canceled` | `moved`), created/updated dates.

## Invitation statuses

Owner-tracked (friends never need the app): after they reply in text/WhatsApp, you mark accepted, canceled, or move the invite to another free slot.

## First invitation

Hey {name} — I’d love to catch up. Want to {idea} at {place}? I’m free {weekday, date · time range}.

## Decision rule

If a feature makes it easier to put a friend on your free calendar this week, consider it. If it makes Vemos more like a social network or event directory, leave it out.
