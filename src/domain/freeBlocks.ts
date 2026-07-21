import {
  dateAtMinutes,
  formatDateKey,
  weekDates,
} from './time';
import type { ConcreteSlot, FreeBlock, Invitation } from './types';

const ACTIVE_STATUSES = new Set(['to_send', 'sent', 'accepted']);

export function expandFreeBlocksForWeek(
  freeBlocks: FreeBlock[],
  weekStart: Date,
): ConcreteSlot[] {
  const days = weekDates(weekStart);
  const slots: ConcreteSlot[] = [];

  for (const day of days) {
    const dateKey = formatDateKey(day);
    const dayOfWeek = day.getDay();

    for (const block of freeBlocks) {
      if (block.kind === 'recurring') {
        if (block.dayOfWeek !== dayOfWeek) {
          continue;
        }
        if (block.endMinutes <= block.startMinutes) {
          continue;
        }
        slots.push(makeSlot(block.id, dateKey, dayOfWeek, block.startMinutes, block.endMinutes, block.label));
      } else if (block.date === dateKey) {
        if (block.endMinutes <= block.startMinutes) {
          continue;
        }
        slots.push(makeSlot(block.id, dateKey, dayOfWeek, block.startMinutes, block.endMinutes, block.label));
      }
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

function makeSlot(
  sourceBlockId: string,
  date: string,
  dayOfWeek: number,
  startMinutes: number,
  endMinutes: number,
  label: string,
): ConcreteSlot {
  const startAt = dateAtMinutes(date, startMinutes).toISOString();
  const endAt = dateAtMinutes(date, endMinutes).toISOString();
  return {
    key: `${sourceBlockId}:${date}:${startMinutes}`,
    date,
    dayOfWeek,
    startMinutes,
    endMinutes,
    startAt,
    endAt,
    sourceBlockId,
    label,
  };
}

export function invitationsForWeek(
  invitations: Invitation[],
  weekStart: Date,
): Invitation[] {
  const startMs = weekStart.getTime();
  const endMs = weekDates(weekStart)[6]!.getTime() + 24 * 60 * 60 * 1000;
  return invitations.filter((invite) => {
    if (invite.status === 'canceled' || invite.status === 'moved') {
      return false;
    }
    const t = new Date(invite.startAt).getTime();
    return t >= startMs && t < endMs;
  });
}

/** True if this free slot already has an active invitation overlapping it. */
export function slotIsBooked(slot: ConcreteSlot, invitations: Invitation[]): boolean {
  return invitations.some((invite) => {
    if (!ACTIVE_STATUSES.has(invite.status)) {
      return false;
    }
    const aStart = new Date(invite.startAt).getTime();
    const aEnd = new Date(invite.endAt).getTime();
    const bStart = new Date(slot.startAt).getTime();
    const bEnd = new Date(slot.endAt).getTime();
    return aStart < bEnd && aEnd > bStart;
  });
}

export function invitationOverlapsSlot(invite: Invitation, slot: ConcreteSlot): boolean {
  if (!ACTIVE_STATUSES.has(invite.status)) {
    return false;
  }
  const aStart = new Date(invite.startAt).getTime();
  const aEnd = new Date(invite.endAt).getTime();
  const bStart = new Date(slot.startAt).getTime();
  const bEnd = new Date(slot.endAt).getTime();
  return aStart < bEnd && aEnd > bStart;
}
