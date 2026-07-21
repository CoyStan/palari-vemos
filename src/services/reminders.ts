import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { catchUpStatus, formatClock } from '../domain/model';
import type { AppData } from '../domain/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function rescheduleReminders(data: AppData): Promise<void> {
  if (Platform.OS === 'web') {
    return;
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

  const now = Date.now();
  const schedules: { title: string; body: string; when: Date }[] = [];

  if (data.settings.notifyFreeSlots) {
    const upcoming = data.availability.length > 0;
    if (upcoming) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      if (tomorrow.getTime() > now) {
        schedules.push({
          title: 'So, when?',
          body: 'You’re free soon. Want to invite someone?',
          when: tomorrow,
        });
      }
    }
  }

  if (data.settings.notifyCatchUpDue) {
    const due = data.friends.find((friend) => catchUpStatus(friend) === 'due');
    if (due) {
      const when = new Date(now + 60 * 60 * 1000);
      schedules.push({
        title: 'So, when?',
        body: `It’s been a while since you saw ${due.name}. Want to make a plan?`,
        when,
      });
    }
  }

  if (data.settings.notifyPlanTomorrow) {
    for (const plan of data.plans) {
      if (plan.status !== 'on' && plan.status !== 'waiting') {
        continue;
      }
      const start = new Date(plan.startAt);
      const reminder = new Date(start);
      reminder.setDate(reminder.getDate() - 1);
      reminder.setHours(18, 0, 0, 0);
      if (reminder.getTime() > now) {
        const mins = start.getHours() * 60 + start.getMinutes();
        schedules.push({
          title: plan.title,
          body: `Tomorrow at ${formatClock(mins, data.settings.timeFormat24h)}.`,
          when: reminder,
        });
      }
    }
  }

  if (data.settings.notifyAskIfHappened) {
    for (const plan of data.plans) {
      if (plan.status === 'done' || plan.status === 'cancelled') {
        continue;
      }
      const end = new Date(plan.endAt);
      const ask = new Date(end.getTime() + 60 * 60 * 1000);
      if (ask.getTime() > now) {
        schedules.push({
          title: 'So, when?',
          body: `Did “${plan.title}” happen?`,
          when: ask,
        });
      }
    }
  }

  for (const item of schedules.slice(0, 20)) {
    const seconds = Math.max(60, Math.floor((item.when.getTime() - now) / 1000));
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
    } catch {
      // Local notifications may be unavailable in Expo Go / web.
    }
  }
}
