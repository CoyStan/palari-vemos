import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { buildReminderSpecs } from "../domain/reminders";
import type { AppData } from "../domain/types";

export { buildReminderSpecs } from "../domain/reminders";
export type { ReminderSpec } from "../domain/reminders";

export const REMINDER_CHANNEL_ID = "sowhen-quiet";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let latestRevision = 0;

export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Quiet reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    bypassDnd: false,
    description: "Optional plan and catch-up nudges from So, When?",
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }
  await ensureReminderChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}

export async function rescheduleReminders(
  data: AppData,
  revision?: number,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  if (typeof revision === "number") {
    if (revision < latestRevision) return;
    latestRevision = revision;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }

  if (!data.settings.notificationsEnabled) {
    return;
  }

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return;
  }

  if (typeof revision === "number" && revision < latestRevision) {
    return;
  }

  const specs = buildReminderSpecs(data, new Date());
  for (const spec of specs) {
    const seconds = Math.max(
      1,
      Math.round((spec.triggerAt.getTime() - Date.now()) / 1000),
    );
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: spec.title,
          body: spec.body,
          ...(Platform.OS === "android"
            ? { channelId: REMINDER_CHANNEL_ID }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });
    } catch {
      /* skip individual failures */
    }
  }
}
