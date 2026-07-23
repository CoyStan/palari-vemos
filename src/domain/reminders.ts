import { catchUpBaselineIso, catchUpStatus, rhythmDays } from "./model";
import { daysSince, formatDateKey } from "./time";
import type { AppData, Friend } from "./types";

export type ReminderSpec = {
  key: string;
  title: string;
  body: string;
  triggerAt: Date;
};

/** Days past cadence: higher = more overdue. Non-due friends return null. */
function overdueDays(friend: Friend, now: Date): number | null {
  if (catchUpStatus(friend, now) !== "due") return null;
  const cadence = rhythmDays(friend);
  if (cadence === null) return null;
  const since = daysSince(catchUpBaselineIso(friend), now);
  if (since === null) return null;
  return since - cadence;
}

function nextElevenOClock(from: Date): Date {
  const quiet = new Date(from);
  quiet.setHours(11, 0, 0, 0);
  if (quiet.getTime() <= from.getTime()) {
    quiet.setDate(quiet.getDate() + 1);
  }
  return quiet;
}

/** Pure reminder planner — unit-tested without Expo. */
export function buildReminderSpecs(
  data: AppData,
  now = new Date(),
): ReminderSpec[] {
  if (!data.settings.notificationsEnabled) {
    return [];
  }

  const specs: ReminderSpec[] = [];
  const showNames = data.settings.showReminderNames;

  if (data.settings.notifyPlanTomorrow) {
    for (const plan of data.plans) {
      if (plan.status !== "on" && plan.status !== "waiting") continue;
      const start = new Date(plan.startAt);
      if (start.getTime() <= now.getTime()) continue;
      const eveningBefore = new Date(start);
      eveningBefore.setDate(eveningBefore.getDate() - 1);
      eveningBefore.setHours(19, 0, 0, 0);
      if (eveningBefore.getTime() > now.getTime()) {
        specs.push({
          key: `plan-eve:${plan.id}`,
          title: "So, When?",
          body: showNames
            ? `Tomorrow: ${plan.title}`
            : "You have a plan tomorrow.",
          triggerAt: eveningBefore,
        });
      }
    }
  }

  if (data.settings.notifyAskIfHappened) {
    for (const plan of data.plans) {
      if (plan.status !== "on" && plan.status !== "waiting") continue;
      const end = new Date(plan.endAt);
      const askAt = new Date(end.getTime() + 30 * 60_000);
      if (askAt.getTime() <= now.getTime()) continue;
      specs.push({
        key: `plan-ask:${plan.id}`,
        title: "So, When?",
        body: showNames
          ? `Did ${plan.title} happen?`
          : "Did your catch-up happen?",
        triggerAt: askAt,
      });
    }
  }

  if (data.settings.notifyCatchUpDue) {
    const dueFriends = data.friends
      .map((friend) => ({ friend, overdue: overdueDays(friend, now) }))
      .filter(
        (item): item is { friend: Friend; overdue: number } =>
          item.overdue !== null,
      )
      .sort((a, b) => {
        if (b.overdue !== a.overdue) return b.overdue - a.overdue;
        return a.friend.name.localeCompare(b.friend.name);
      })
      .map((item) => item.friend);

    if (dueFriends.length > 0) {
      const first = nextElevenOClock(now);
      for (let i = 0; i < 4; i += 1) {
        const triggerAt = new Date(first);
        triggerAt.setDate(first.getDate() + i * 7);
        const friend = dueFriends[i % dueFriends.length]!;
        specs.push({
          key: `catchup:${friend.id}:${formatDateKey(triggerAt)}`,
          title: "So, When?",
          body: showNames
            ? `Want to make a plan with ${friend.name}?`
            : "Someone might be due for a catch-up.",
          triggerAt,
        });
      }
    }
  }

  return specs
    .sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime())
    .filter(
      (spec, index, all) =>
        all.findIndex((item) => item.key === spec.key) === index,
    )
    .slice(0, 32);
}
