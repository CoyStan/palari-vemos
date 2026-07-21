export type ShareMethod =
  | 'whatsapp'
  | 'sms'
  | 'telegram'
  | 'message'
  | 'other';

export type CatchUpRhythm =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'custom'
  | 'none';

export type FriendCatchUpStatus = 'due' | 'soon' | 'none';

export type InviteStatus =
  | 'not_invited'
  | 'waiting'
  | 'yes'
  | 'maybe'
  | 'no'
  | 'new_time'
  | 'moved';

export type PlanStatus =
  | 'draft'
  | 'waiting'
  | 'on'
  | 'needs_time'
  | 'done'
  | 'cancelled';

export type AvailabilityKind = 'recurring' | 'oneoff';

export type Recurrence =
  | 'weekly'
  | 'biweekly'
  | 'daily';

export type Friend = {
  id: string;
  name: string;
  photoUri: string | null;
  phone: string;
  shareMethod: ShareMethod;
  rhythm: CatchUpRhythm;
  /** Days for custom rhythm; ignored unless rhythm === 'custom'. */
  customDays: number;
  lastMetAt: string | null;
  createdAt: string;
};

export type AvailabilityRule = {
  id: string;
  kind: AvailabilityKind;
  label: string;
  /** 0=Sun … 6=Sat; empty for one-off */
  daysOfWeek: number[];
  startMinutes: number;
  endMinutes: number;
  recurrence: Recurrence;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD or null = until turned off */
  endDate: string | null;
  /** For one-off only */
  oneOffDate: string | null;
  enabled: boolean;
  createdAt: string;
};

/** Skipped occurrence of a recurring rule (does not delete the rule). */
export type SkippedOccurrence = {
  ruleId: string;
  /** YYYY-MM-DD */
  date: string;
};

export type PlanFriend = {
  friendId: string;
  status: InviteStatus;
  invitationText: string;
};

export type Plan = {
  id: string;
  title: string;
  activity: string;
  place: string;
  note: string;
  startAt: string;
  endAt: string;
  availabilityKey: string | null;
  friends: PlanFriend[];
  status: PlanStatus;
  /** After-the-moment capture, filled once the plan is done. */
  memoryNote: string;
  memoryPhotoUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InviteTone = 'warm' | 'casual' | 'playful';

export type AppSettings = {
  notificationsEnabled: boolean;
  notifyFreeSlots: boolean;
  notifyCatchUpDue: boolean;
  notifyWaitingFollowUp: boolean;
  notifyPlanTomorrow: boolean;
  notifyAskIfHappened: boolean;
  defaultDurationMinutes: number;
  /** 0=Sun … 6=Sat */
  firstDayOfWeek: number;
  timeFormat24h: boolean;
  /** First hour shown in week/day calendar (0–23). Display only. */
  calendarDayStartHour: number;
  /** Exclusive end hour for week/day calendar (1–24). Display only. */
  calendarDayEndHour: number;
};

export type AppData = {
  onboardingComplete: boolean;
  friends: Friend[];
  availability: AvailabilityRule[];
  skipped: SkippedOccurrence[];
  plans: Plan[];
  settings: AppSettings;
};

export type ConcreteSlot = {
  key: string;
  ruleId: string | null;
  date: string;
  startMinutes: number;
  endMinutes: number;
  startAt: string;
  endAt: string;
  label: string;
};

export const defaultSettings = (): AppSettings => ({
  notificationsEnabled: false,
  notifyFreeSlots: true,
  notifyCatchUpDue: true,
  notifyWaitingFollowUp: true,
  notifyPlanTomorrow: true,
  notifyAskIfHappened: true,
  defaultDurationMinutes: 120,
  firstDayOfWeek: 1,
  timeFormat24h: false,
  calendarDayStartHour: 7,
  calendarDayEndHour: 22,
});
