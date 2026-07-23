import { Platform } from "react-native";
import { createEventInCalendarAsync } from "expo-calendar/legacy";

import type { Plan } from "../domain/types";

export type CalendarHandoffResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "failed"; message: string };

/**
 * One-way OS calendar create-event UI. Does not request calendar permissions
 * or read the user's calendars.
 */
export async function addPlanToCalendar(
  plan: Plan,
): Promise<CalendarHandoffResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      reason: "unsupported",
      message: "Calendar handoff works on Android and iOS.",
    };
  }
  try {
    await createEventInCalendarAsync({
      title: plan.title || "Catch up",
      startDate: new Date(plan.startAt),
      endDate: new Date(plan.endAt),
      location: plan.place || undefined,
      notes: plan.note || undefined,
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "failed",
      message: "Could not open the calendar app. You can try again later.",
    };
  }
}
