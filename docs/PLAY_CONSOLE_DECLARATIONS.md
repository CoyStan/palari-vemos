# Play Console declarations (advisory)

Fill these forms from the **final AAB**, not from this checklist alone.

## App identity

| Field | Value |
| --- | --- |
| App name | So, When? |
| Package | `com.sowhen.myapp` (must match Google Play Console) |
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

Contacts: prefer OS single-contact picker with minimal permissions; if `READ_CONTACTS` is required by the picker on target APIs, request only on Choose Contact with in-app explanation and manual entry fallback. Do not claim “no contact permission” until the final binary proves it.

## Content rating / ads

No ads. Friendship organizer for adults. Not directed to children under 13.
