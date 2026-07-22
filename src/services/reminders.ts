import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { AppData } from "../domain/types";
import { ReminderCoordinator, type ReminderIo } from "./reminderCoordinator";

export { buildReminderSpecs } from "../domain/reminders";
export type { ReminderSpec } from "../domain/reminders";
export {
  ReminderCoordinator,
  createFakeReminderIo,
} from "./reminderCoordinator";

export const REMINDER_CHANNEL_ID = "sowhen-quiet";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

const liveIo: ReminderIo = {
  cancelAll: async () => {
    if (Platform.OS === "web") return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      /* ignore */
    }
  },
  schedule: async ({ title, body, triggerAt }) => {
    const seconds = Math.max(
      1,
      Math.round((triggerAt.getTime() - Date.now()) / 1000),
    );
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
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
  },
  ensurePermission: ensureNotificationPermission,
  now: () => new Date(),
};

/** App-wide coordinator — hydrate, foreground, commits, wipe, startFresh. */
export const reminderCoordinator = new ReminderCoordinator(liveIo);

export async function cancelAllReminders(): Promise<void> {
  await reminderCoordinator.resetAndCancel();
}

export async function rescheduleReminders(
  data: AppData,
  revision?: number,
): Promise<void> {
  if (Platform.OS === "web") return;
  await reminderCoordinator.schedule(data, revision);
}
