import { formatDateKey } from "./time";
import type { CatchUpLog, Plan } from "./types";

export type { CatchUpLog } from "./types";

/** One calendar day of catch-up history, aggregated for the Months view. */
export type DayMark = {
  /** YYYY-MM-DD */
  date: string;
  /** Unique friends seen that day (done-plan attendance ∪ manual logs). */
  seenFriendIds: string[];
  /** Done plans that day that had at least one attendee. */
  donePlanIds: string[];
  /** Upcoming plans that day (status on/waiting). */
  upcomingPlanIds: string[];
};

export type DayMarkSize = "none" | "small" | "medium" | "large";

/** Dot size per unique friends seen: 1 → small, 2 → medium, 3+ → large. */
export function dayMarkSize(uniqueFriendsSeen: number): DayMarkSize {
  if (uniqueFriendsSeen <= 0) return "none";
  if (uniqueFriendsSeen === 1) return "small";
  if (uniqueFriendsSeen === 2) return "medium";
  return "large";
}

/**
 * Aggregate plans and manual catch-up logs into per-day marks, keyed by
 * YYYY-MM-DD. A friend counts once per day no matter how many sources mention
 * them, so a done plan plus a manual log for the same friend never inflates
 * the dot. Done plans with zero attendees mark nothing (nobody was seen);
 * cancelled plans mark nothing.
 */
export function buildDayMarks(
  plans: Plan[],
  catchUps: CatchUpLog[],
): Map<string, DayMark> {
  const marks = new Map<string, DayMark>();

  const ensure = (date: string): DayMark => {
    const existing = marks.get(date);
    if (existing) {
      return existing;
    }
    const created: DayMark = {
      date,
      seenFriendIds: [],
      donePlanIds: [],
      upcomingPlanIds: [],
    };
    marks.set(date, created);
    return created;
  };

  const addUnique = (list: string[], id: string) => {
    if (!list.includes(id)) {
      list.push(id);
    }
  };

  for (const plan of plans) {
    const date = formatDateKey(new Date(plan.startAt));
    if (plan.status === "done" && plan.attendedFriendIds.length > 0) {
      const mark = ensure(date);
      mark.donePlanIds.push(plan.id);
      for (const friendId of plan.attendedFriendIds) {
        addUnique(mark.seenFriendIds, friendId);
      }
      continue;
    }
    if (plan.status === "on" || plan.status === "waiting") {
      ensure(date).upcomingPlanIds.push(plan.id);
    }
  }

  for (const log of catchUps) {
    addUnique(ensure(log.date).seenFriendIds, log.friendId);
  }

  return marks;
}
