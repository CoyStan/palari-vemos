import { formatSlotRange } from './time';
import type { Friend, Invitation, InvitationStatus } from './types';

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  to_send: 'To send',
  sent: 'Sent',
  accepted: 'Accepted',
  canceled: 'Canceled',
  moved: 'Moved',
};

export function buildInvitationText(input: {
  name: string;
  idea: string;
  place?: string;
  startAt: string;
  endAt: string;
}): string {
  const name = input.name.trim() || 'there';
  const idea = input.idea.trim() || 'catch up';
  const place = input.place?.trim();
  const placePart = place ? ` at ${place}` : '';
  const when = formatSlotRange(input.startAt, input.endAt);
  return `Hey ${name} — I’d love to catch up. Want to ${idea}${placePart}? I’m free ${when}.`;
}

export function createInvitationDraft(input: {
  friend: Friend;
  startAt: string;
  endAt: string;
  idea: string;
  place: string;
}): Omit<Invitation, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    friendId: input.friend.id,
    startAt: input.startAt,
    endAt: input.endAt,
    idea: input.idea,
    place: input.place,
    invitationText: buildInvitationText({
      name: input.friend.name,
      idea: input.idea,
      place: input.place,
      startAt: input.startAt,
      endAt: input.endAt,
    }),
    status: 'to_send',
    movedFromId: null,
  };
}
