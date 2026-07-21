import { daysSince } from './time';
import type { Friend } from './types';

/**
 * Prefer higher priority, then people you haven’t seen in longer.
 * Never frames anyone as overdue — this is only sort order for the picker.
 */
export function sortFriendsForInvite(friends: Friend[], now = new Date()): Friend[] {
  return [...friends].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const aDays = daysSince(a.lastMetAt, now);
    const bDays = daysSince(b.lastMetAt, now);
    if (aDays === null && bDays === null) {
      return a.name.localeCompare(b.name);
    }
    if (aDays === null) {
      return -1;
    }
    if (bDays === null) {
      return 1;
    }
    if (bDays !== aDays) {
      return bDays - aDays;
    }
    return a.name.localeCompare(b.name);
  });
}
