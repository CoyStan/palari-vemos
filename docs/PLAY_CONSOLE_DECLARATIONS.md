# Play Console declarations (advisory)

Fill these forms from the **final AAB**, not from this checklist alone.

## App identity

| Field | Value |
| --- | --- |
| App name | So, When? |
| Package | `com.palarilabs.vemos` (keep until owner confirms whether Play already has a build; otherwise consider `io.palari.sowhen`) |
| Publisher | Palari Labs, Inc. |
| Privacy policy URL | Host `docs/PRIVACY_POLICY.md` / `docs/privacy-policy.html` at HTTPS |

## Data safety (expected for this release)

| Topic | Declaration direction |
| --- | --- |
| Account / login | Not collected |
| Name / phone / photos | Collected and stored on-device only; user-initiated; not shared with Palari Labs |
| Messages | User shares via OS apps; not transmitted to Palari Labs |
| Analytics / ads / crash SDKs | Not used |
| Encryption in transit (our servers) | N/A — no So, When? cloud |
| Data deletion | In-app wipe + uninstall |

## Permissions to verify in merged manifest

Must not appear without justification:

- `WRITE_CONTACTS`
- `CAMERA`
- `RECORD_AUDIO`
- broad storage / `READ_MEDIA_IMAGES` if unused
- `AD_ID`
- `QUERY_ALL_PACKAGES`
- exact alarm access if unused

Contacts: not used. Friends are typed manually; do not declare contact data collection. Confirm the final AAB has no `READ_CONTACTS`.

Calendar: one-way OS create-event handoff only (no calendar read). Confirm the final AAB has no `READ_CALENDAR` / `WRITE_CALENDAR`.

## Content rating / ads

No ads. Friendship organizer for adults. Not directed to children under 13.
