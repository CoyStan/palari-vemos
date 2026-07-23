export type ShareMethod = "whatsapp" | "sms" | "telegram" | "message" | "other";

export type CatchUpRhythm =
  "weekly" | "monthly" | "quarterly" | "custom" | "none";

export type FriendCatchUpStatus = "due" | "soon" | "none";

export type InviteStatus =
  "not_invited" | "waiting" | "yes" | "maybe" | "no" | "new_time" | "moved";

export type PlanStatus =
  "draft" | "waiting" | "on" | "needs_time" | "done" | "cancelled";

export type AvailabilityKind = "recurring" | "oneoff";

export type Recurrence = "weekly" | "biweekly" | "daily";

export type InviteTone = "warm" | "casual" | "playful";

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
  inviteTone: InviteTone;
  invitationCustomized: boolean;
  sentAt: string | null;
  /** Preserved when a friend is deleted from completed history. */
  displayNameSnapshot: string | null;
};

/** Snapshot of what was handed to the OS calendar create-event UI (WP6). */
export type PlanCalendarExport = {
  exportedAt: string;
  startAt: string;
  endAt: string;
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
  /** Explicit attendees chosen when marking Done; never invented on migrate. */
  attendedFriendIds: string[];
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Last OS calendar handoff; null until the user adds the plan to a calendar. */
  calendarExport: PlanCalendarExport | null;
};

/** Manual “we caught up” log for Months-view history (one per friend per day). */
export type CatchUpLog = {
  id: string;
  friendId: string;
  /** YYYY-MM-DD — local day the catch-up happened. */
  date: string;
  createdAt: string;
};

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
  /** First hour shown in week calendar (0–23). Display only. */
  calendarDayStartHour: number;
  /** Exclusive end hour for week calendar (1–24). Display only. */
  calendarDayEndHour: number;
  /** When false, reminder notifications stay generic on the lock screen. */
  showReminderNames: boolean;
};

export type AppData = {
  schemaVersion: number;
  onboardingComplete: boolean;
  friends: Friend[];
  availability: AvailabilityRule[];
  skipped: SkippedOccurrence[];
  plans: Plan[];
  /** Manual catch-up history; done-plan attendance is derived separately. */
  catchUps: CatchUpLog[];
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
  notifyFreeSlots: false,
  notifyCatchUpDue: true,
  notifyWaitingFollowUp: false,
  notifyPlanTomorrow: true,
  notifyAskIfHappened: true,
  defaultDurationMinutes: 60,
  firstDayOfWeek: 0,
  timeFormat24h: false,
  calendarDayStartHour: 7,
  calendarDayEndHour: 22,
  showReminderNames: false,
});
