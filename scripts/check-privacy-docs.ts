/**
 * Fail if docs/PRIVACY_POLICY.md or docs/privacy-policy.html drift from
 * src/content/privacyPolicy.ts. Run `npm run sync:privacy` to regenerate.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

function expectedMarkdown(): string {
  return `${PRIVACY_POLICY_MARKDOWN.trimEnd()}\n`;
}

function expectedHtml(): string {
  const sections = PRIVACY_POLICY_SECTIONS.map(
    (s) => `  <h2>${escapeHtml(s.title)}</h2>\n  <p>${escapeHtml(s.body)}</p>`,
  ).join("\n");

  return `<!DOCTYPE html>
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
${sections}
</body>
</html>
`;
}

const mdPath = join(root, "docs/PRIVACY_POLICY.md");
const htmlPath = join(root, "docs/privacy-policy.html");
const actualMd = readFileSync(mdPath, "utf8");
const actualHtml = readFileSync(htmlPath, "utf8");
const expectMd = expectedMarkdown();
const expectHtml = expectedHtml();

if (actualMd !== expectMd || actualHtml !== expectHtml) {
  console.error(
    "Privacy docs are out of sync with src/content/privacyPolicy.ts.\n" +
      "Run: npm run sync:privacy",
  );
  process.exit(1);
}

assert.equal(actualMd, expectMd);
assert.equal(actualHtml, expectHtml);
console.log("privacy docs: ok");
