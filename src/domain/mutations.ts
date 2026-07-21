import {
  buildInviteText,
  computePlanStatus,
  intervalsOverlap,
  proposePlanWindow,
  slotConflictsWithPlans,
} from './model';
import type {
  AppData,
  AppSettings,
  AvailabilityRule,
  CatchUpRhythm,
  ConcreteSlot,
  Friend,
  InviteStatus,
  InviteTone,
  Plan,
  PlanFriend,
  PlanStatus,
  ShareMethod,
  SkippedOccurrence,
} from './types';

export type FriendInput = {
  name: string;
  photoUri: string | null;
  phone: string;
  shareMethod: ShareMethod;
  rhythm: CatchUpRhythm;
  customDays: number;
  lastMetAt: string | null;
};

export type AvailabilityInput = Omit<AvailabilityRule, 'id' | 'createdAt'>;

export function updateSettings(data: AppData, patch: Partial<AppSettings>): AppData {
  return { ...data, settings: { ...data.settings, ...patch } };
}

export function upsertFriend(
  data: AppData,
  input: FriendInput,
  createId: (prefix: string) => string,
  friendId?: string,
): { data: AppData; friend: Friend } {
  const name = input.name.trim();
  const now = new Date().toISOString();
  if (friendId) {
    const friends = data.friends.map((friend) => (
      friend.id === friendId
        ? {
          ...friend,
          name,
          photoUri: input.photoUri,
          phone: input.phone.trim(),
          shareMethod: input.shareMethod,
          rhythm: input.rhythm,
          customDays: input.customDays,
          lastMetAt: input.lastMetAt,
        }
        : friend
    ));
    const friend = friends.find((item) => item.id === friendId)!;
    return { data: { ...data, friends }, friend };
  }

  const friend: Friend = {
    id: createId('friend'),
    name,
    photoUri: input.photoUri,
    phone: input.phone.trim(),
    shareMethod: input.shareMethod,
    rhythm: input.rhythm,
    customDays: input.customDays,
    lastMetAt: input.lastMetAt,
    createdAt: now,
  };
  return {
    data: {
      ...data,
      onboardingComplete: true,
      friends: [...data.friends, friend],
    },
    friend,
  };
}

export function removeFriend(data: AppData, friendId: string): AppData {
  const friend = data.friends.find((item) => item.id === friendId);
  const snapshot = friend?.name ?? 'Friend';
  return {
    ...data,
    friends: data.friends.filter((item) => item.id !== friendId),
    plans: data.plans.map((plan) => {
      const kept = plan.friends.filter((item) => item.friendId !== friendId);
      const removed = plan.friends.find((item) => item.friendId === friendId);
      const friends = plan.status === 'done' && removed
        ? [
          ...kept,
          {
            ...removed,
            friendId: `gone_${friendId}`,
            displayNameSnapshot: removed.displayNameSnapshot ?? snapshot,
          },
        ]
        : kept;
      return {
        ...plan,
        friends,
        status: plan.status === 'done' || plan.status === 'cancelled'
          ? plan.status
          : computePlanStatus(friends),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function addAvailabilityRule(
  data: AppData,
  input: AvailabilityInput,
  createId: (prefix: string) => string,
): AppData {
  const rule: AvailabilityRule = {
    ...input,
    id: createId('avail'),
    createdAt: new Date().toISOString(),
  };
  return { ...data, availability: [...data.availability, rule] };
}

export function updateAvailabilityRule(
  data: AppData,
  ruleId: string,
  input: AvailabilityInput,
): AppData {
  return {
    ...data,
    availability: data.availability.map((rule) => (
      rule.id === ruleId ? { ...rule, ...input } : rule
    )),
  };
}

export function skipOccurrenceOnce(
  data: AppData,
  ruleId: string,
  date: string,
): AppData {
  if (data.skipped.some((item) => item.ruleId === ruleId && item.date === date)) {
    return data;
  }
  return { ...data, skipped: [...data.skipped, { ruleId, date }] };
}

export function unskipOccurrence(
  data: AppData,
  ruleId: string,
  date: string,
): AppData {
  return {
    ...data,
    skipped: data.skipped.filter((item) => !(item.ruleId === ruleId && item.date === date)),
  };
}

export function deleteAvailabilityRule(data: AppData, ruleId: string): AppData {
  return {
    ...data,
    availability: data.availability.filter((rule) => rule.id !== ruleId),
    skipped: data.skipped.filter((item) => item.ruleId !== ruleId),
  };
}

export function setAvailabilityEnabledState(
  data: AppData,
  ruleId: string,
  enabled: boolean,
): AppData {
  return {
    ...data,
    availability: data.availability.map((rule) => (
      rule.id === ruleId ? { ...rule, enabled } : rule
    )),
  };
}

export function completeOnboardingState(
  data: AppData,
  input: {
    friend?: FriendInput | null;
    availability?: AvailabilityInput | null;
  },
  createId: (prefix: string) => string,
): AppData {
  const now = new Date().toISOString();
  let next: AppData = { ...data, onboardingComplete: true };
  if (input.friend?.name.trim()) {
    const friend: Friend = {
      id: createId('friend'),
      name: input.friend.name.trim(),
      photoUri: input.friend.photoUri,
      phone: input.friend.phone.trim(),
      shareMethod: input.friend.shareMethod,
      rhythm: input.friend.rhythm,
      customDays: input.friend.customDays,
      lastMetAt: input.friend.lastMetAt,
      createdAt: now,
    };
    next = { ...next, friends: [...next.friends, friend] };
  }
  if (input.availability) {
    const rule: AvailabilityRule = {
      ...input.availability,
      id: createId('avail'),
      createdAt: now,
    };
    next = { ...next, availability: [...next.availability, rule] };
  }
  return next;
}

export function lookAroundFirst(data: AppData): AppData {
  return { ...data, onboardingComplete: true };
}

export type CreatePlanResult =
  | { ok: true; data: AppData; plan: Plan }
  | { ok: false; reason: 'missing' | 'conflict'; message: string };

export function createPlanState(
  data: AppData,
  selectedSlot: ConcreteSlot,
  selectedFriendIds: string[],
  input: { title: string; activity: string; place: string; note: string },
  createId: (prefix: string) => string,
  excludePlanId?: string | null,
): CreatePlanResult {
  if (selectedFriendIds.length === 0) {
    return { ok: false, reason: 'missing', message: 'Pick at least one friend.' };
  }

  const window = proposePlanWindow(
    selectedSlot.startAt,
    selectedSlot.endAt,
    data.settings.defaultDurationMinutes,
  );

  if (slotConflictsWithPlans(window.startAt, window.endAt, data.plans, {
    availabilityKey: selectedSlot.key,
    excludePlanId: excludePlanId ?? null,
  })) {
    return {
      ok: false,
      reason: 'conflict',
      message: 'That time was just taken. Pick another free slot.',
    };
  }

  const now = new Date().toISOString();
  const names = selectedFriendIds
    .map((id) => data.friends.find((friend) => friend.id === id)?.name)
    .filter(Boolean) as string[];
  const title = input.title.trim()
    || (names.length === 1
      ? `Catch up with ${names[0]}`
      : names.length > 1
        ? `Catch up with ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
        : 'Catch up');

  const planFriends: PlanFriend[] = selectedFriendIds.map((friendId) => {
    const friend = data.friends.find((item) => item.id === friendId);
    return {
      friendId,
      status: 'not_invited',
      invitationText: buildInviteText({
        name: friend?.name ?? 'there',
        startAt: window.startAt,
        endAt: window.endAt,
        activity: input.activity,
        place: input.place,
        timeFormat24h: data.settings.timeFormat24h,
      }),
      inviteTone: 'warm',
      invitationCustomized: false,
      sentAt: null,
      displayNameSnapshot: friend?.name ?? null,
    };
  });

  const plan: Plan = {
    id: createId('plan'),
    title,
    activity: input.activity.trim(),
    place: input.place.trim(),
    note: input.note.trim(),
    startAt: window.startAt,
    endAt: window.endAt,
    availabilityKey: selectedSlot.key,
    friends: planFriends,
    status: 'draft',
    memoryNote: '',
    memoryPhotoUri: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ok: true,
    data: { ...data, plans: [plan, ...data.plans] },
    plan,
  };
}

export function setInviteStatusState(
  data: AppData,
  planId: string,
  friendId: string,
  status: InviteStatus,
): AppData {
  return {
    ...data,
    plans: data.plans.map((plan) => {
      if (plan.id !== planId) return plan;
      const friends = plan.friends.map((item) => (
        item.friendId === friendId ? { ...item, status } : item
      ));
      return {
        ...plan,
        friends,
        status: computePlanStatus(friends),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function updateInvitationTextState(
  data: AppData,
  planId: string,
  friendId: string,
  invitationText: string,
  customized = true,
): AppData {
  return {
    ...data,
    plans: data.plans.map((plan) => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        friends: plan.friends.map((item) => (
          item.friendId === friendId
            ? { ...item, invitationText, invitationCustomized: customized }
            : item
        )),
        updatedAt: new Date().toISOString(),
      };
    }),
  };
}

export function markInviteSentState(
  data: AppData,
  planId: string,
  friendId: string,
  sent: boolean,
): AppData {
  const now = new Date().toISOString();
  return {
    ...data,
    plans: data.plans.map((plan) => {
      if (plan.id !== planId) return plan;
      const friends = plan.friends.map((item) => {
        if (item.friendId !== friendId) return item;
        if (!sent) {
          return { ...item, status: 'not_invited' as const, sentAt: null };
        }
        return {
          ...item,
          status: item.status === 'not_invited' ? 'waiting' as const : item.status,
          sentAt: now,
        };
      });
      return {
        ...plan,
        friends,
        status: computePlanStatus(friends),
        updatedAt: now,
      };
    }),
  };
}

export function markPlanDoneState(
  data: AppData,
  planId: string,
  attendedFriendIds: string[],
): AppData {
  const plan = data.plans.find((item) => item.id === planId);
  if (!plan) return data;
  const attended = new Set(attendedFriendIds);
  const eventDay = plan.startAt;
  const now = new Date().toISOString();
  return {
    ...data,
    friends: data.friends.map((friend) => (
      attended.has(friend.id) ? { ...friend, lastMetAt: eventDay } : friend
    )),
    plans: data.plans.map((item) => (
      item.id === planId
        ? { ...item, status: 'done' as const, completedAt: now, updatedAt: now }
        : item
    )),
  };
}

export function markPlanCancelledState(data: AppData, planId: string): AppData {
  const now = new Date().toISOString();
  return {
    ...data,
    plans: data.plans.map((plan) => (
      plan.id === planId
        ? { ...plan, status: 'cancelled' as const, cancelledAt: now, updatedAt: now }
        : plan
    )),
  };
}

export function intervalsOverlapMs(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return intervalsOverlap(aStart, aEnd, bStart, bEnd);
}

export type { SkippedOccurrence, InviteTone };
