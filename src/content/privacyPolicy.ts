/** Canonical privacy policy copy for in-app display. Keep docs/PRIVACY_POLICY.md in sync. */

export const PRIVACY_POLICY_EFFECTIVE_DATE = 'July 21, 2026';

export const PRIVACY_POLICY_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Who we are',
    body:
      'So, When? is made by Palari Labs, Inc. (“Palari Labs,” “we,” “us”). This policy explains how the Android app So, When? (package com.palarilabs.vemos) handles information. Version 1 is a private, on-device organizer. Friends do not need the app, an account, or a link from us.',
  },
  {
    title: 'Summary',
    body:
      'So, When? does not require an account and does not operate a So, When? backend that stores your friends, plans, or messages. Information you enter stays on your device unless you choose to share it yourself (for example through the system share sheet) or export a copy. We do not sell personal information.',
  },
  {
    title: 'Information stored on your device',
    body:
      'Depending on how you use the app, So, When? may store locally: friend names and optional photos, phone numbers, or preferred share methods you add; catch-up rhythms and last-met dates; availability rules and skipped occurrences; plans (time, activity, place, notes) and per-friend invite statuses you set; optional plan memory notes or photos; and settings such as reminder preferences, calendar day hours, and display defaults. This data is kept in on-device storage (AsyncStorage) under a local key such as sowhen.v1.',
  },
  {
    title: 'Contacts',
    body:
      'If you use the contact picker, the operating system lets you choose a single contact. So, When? may copy only the name and phone number you select into a friend record on your device. The app does not scan, upload, or sync your full address book.',
  },
  {
    title: 'Photos',
    body:
      'If you grant photo permission, you may attach an optional photo for a friend or a plan memory. Photos you pick are referenced or stored for display in the app on this device. We do not upload them to Palari Labs servers.',
  },
  {
    title: 'Notifications',
    body:
      'Optional local reminders use the device notification system (for example free-time, catch-up, or follow-up nudges). These reminders are scheduled on your device. Version 1 does not use remote push from a Palari Labs server.',
  },
  {
    title: 'Sharing invitations',
    body:
      'When you share an invitation, the message is opened through the Android share sheet or apps you choose (such as WhatsApp, SMS, or Telegram). Delivery and content handling after you leave So, When? are controlled by those apps and your device—not by a So, When? messaging service. We cannot see whether a friend received or read a message.',
  },
  {
    title: 'Export and deletion',
    body:
      'Settings lets you export a JSON copy of your on-device data via the system share sheet, and delete all So, When? data on this device. Uninstalling the app typically removes local app storage, subject to how Android and your backups work. Clearing app data in system settings also removes local So, When? data.',
  },
  {
    title: 'What we do not collect in Version 1',
    body:
      'So, When? Version 1 does not create accounts; does not send friend lists, plans, or invitation text to Palari Labs servers; and does not include analytics, advertising, crash-reporting SDKs, or social login in the product as shipped for this release. If we add such services later, we will update this policy and Play Console disclosures before shipping that change.',
  },
  {
    title: 'Children',
    body:
      'So, When? is not directed to children under 13, and we do not knowingly collect personal information from children under 13 through a Palari Labs account or server. Because Version 1 keeps data on-device, parents who install the app control the device and the data entered into it.',
  },
  {
    title: 'Your choices',
    body:
      'You can deny contacts, photos, or notification permissions in system settings; use the app without those features; export or wipe data in Settings; and uninstall the app at any time.',
  },
  {
    title: 'Changes',
    body:
      'We may update this policy when the product’s data practices change. The effective date at the top will change when we do. Continued use after an update means you accept the revised policy for the then-current app version.',
  },
  {
    title: 'Contact',
    body:
      'Questions about this policy: privacy@palarilabs.com. For the Play Store listing, the same policy is also published at a public HTTPS URL by Palari Labs, Inc.',
  },
];

export const PRIVACY_POLICY_MARKDOWN = [
  `# Privacy Policy — So, When?`,
  ``,
  `**Effective date:** ${PRIVACY_POLICY_EFFECTIVE_DATE}`,
  ``,
  `**App:** So, When? (Android package \`com.palarilabs.vemos\`)`,
  `**Publisher:** Palari Labs, Inc.`,
  ``,
  ...PRIVACY_POLICY_SECTIONS.flatMap((section) => [
    `## ${section.title}`,
    ``,
    section.body,
    ``,
  ]),
].join('\n');
