export type ContactMethod =
  | 'message'
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'other';

export type InvitationStatus =
  | 'to_send'
  | 'sent'
  | 'accepted'
  | 'canceled'
  | 'moved';

export type Friend = {
  id: string;
  name: string;
  note: string;
  contactMethod: ContactMethod;
  /** 1–5; higher means invite more often when picking who to meet. */
  priority: number;
  lastMetAt: string | null;
  createdAt: string;
};

export type RecurringFreeBlock = {
  id: string;
  kind: 'recurring';
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  label: string;
};

export type OneOffFreeBlock = {
  id: string;
  kind: 'oneoff';
  /** YYYY-MM-DD in local calendar terms */
  date: string;
  startMinutes: number;
  endMinutes: number;
  label: string;
};

export type FreeBlock = RecurringFreeBlock | OneOffFreeBlock;

export type Invitation = {
  id: string;
  friendId: string;
  startAt: string;
  endAt: string;
  idea: string;
  place: string;
  invitationText: string;
  status: InvitationStatus;
  movedFromId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  onboardingComplete: boolean;
  friends: Friend[];
  freeBlocks: FreeBlock[];
  invitations: Invitation[];
};

export type ContactOption = {
  value: ContactMethod;
  label: string;
};

export type PriorityOption = {
  value: number;
  label: string;
  hint: string;
};

/** A concrete free window on a specific day, expanded from recurring/one-off. */
export type ConcreteSlot = {
  key: string;
  date: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  startAt: string;
  endAt: string;
  sourceBlockId: string;
  label: string;
};

export type PlanIdea = {
  idea: string;
  place: string;
};
