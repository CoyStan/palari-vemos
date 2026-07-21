/**
 * Sync docs/PRIVACY_POLICY.md and docs/privacy-policy.html from src/content/privacyPolicy.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_PACKAGE_ID,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_MARKDOWN,
  PRIVACY_POLICY_SECTIONS,
} from "../src/content/privacyPolicy";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

writeFileSync(
  join(root, "docs/PRIVACY_POLICY.md"),
  `${PRIVACY_POLICY_MARKDOWN.trimEnd()}\n`,
);

const sections = PRIVACY_POLICY_SECTIONS.map(
  (s) => `  <h2>${escapeHtml(s.title)}</h2>\n  <p>${escapeHtml(s.body)}</p>`,
).join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — So, When?</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Georgia, "Times New Roman", serif; max-width: 40rem; margin: 2rem auto; padding: 0 1.25rem 3rem; line-height: 1.55; color: #2A2C31; background: #FAF8F5; }
    h1 { font-size: 1.75rem; }
    h2 { font-size: 1.15rem; margin-top: 1.75rem; }
    .meta { color: #6B7280; font-size: 0.95rem; }
  </style>
</head>
<body>
  <h1>Privacy Policy — So, When?</h1>
  <p class="meta">Effective date: ${PRIVACY_POLICY_EFFECTIVE_DATE}<br />App: So, When?<br />Android package: ${PRIVACY_PACKAGE_ID}<br />Publisher: Palari Labs, Inc.<br />Contact: ${PRIVACY_CONTACT_EMAIL}</p>
  <p class="meta"><strong>Deployment needed:</strong> publish this file (docs/privacy-policy.html) to a public HTTPS URL, then paste that URL into Google Play Console → App content → Privacy policy. It is not hosted yet.</p>
${sections}
</body>
</html>
`;

writeFileSync(join(root, "docs/privacy-policy.html"), html);
console.log("privacy docs synced");
