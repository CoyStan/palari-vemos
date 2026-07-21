import { catchUpStatus } from "./model";
import type { AppData } from "./types";

export type ReminderSpec = {
  key: string;
  title: string;
  body: string;
  triggerAt: Date;
};

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
    const due = data.friends
      .filter((friend) => catchUpStatus(friend, now) === "due")
      .sort((a, b) => a.name.localeCompare(b.name))[0];
    if (due) {
      const quiet = new Date(now);
      quiet.setHours(11, 0, 0, 0);
      if (quiet.getTime() <= now.getTime()) {
        quiet.setDate(quiet.getDate() + 1);
      }
      specs.push({
        key: `catchup:${due.id}:${quiet.toISOString().slice(0, 10)}`,
        title: "So, When?",
        body: showNames
          ? `Want to make a plan with ${due.name}?`
          : "Someone might be due for a catch-up.",
        triggerAt: quiet,
      });
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
