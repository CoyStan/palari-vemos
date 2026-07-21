import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AppData,
  FreeBlock,
  Friend,
  Invitation,
  OneOffFreeBlock,
  RecurringFreeBlock,
} from '../domain/types';

const STORAGE_KEY = 'vemos.v2';

export const emptyAppData = (): AppData => ({
  onboardingComplete: false,
  friends: [],
  freeBlocks: [],
  invitations: [],
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFriend(value: unknown): Friend | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.id !== 'string'
    || typeof value.name !== 'string'
    || typeof value.contactMethod !== 'string'
    || typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  const priority = typeof value.priority === 'number'
    ? Math.min(5, Math.max(1, Math.round(value.priority)))
    : 3;

  return {
    id: value.id,
    name: value.name,
    note: typeof value.note === 'string' ? value.note : '',
    contactMethod: value.contactMethod as Friend['contactMethod'],
    priority,
    lastMetAt: typeof value.lastMetAt === 'string' || value.lastMetAt === null
      ? (value.lastMetAt as string | null)
      : null,
    createdAt: value.createdAt,
  };
}

function parseFreeBlock(value: unknown): FreeBlock | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.id !== 'string'
    || typeof value.startMinutes !== 'number'
    || typeof value.endMinutes !== 'number'
  ) {
    return null;
  }

  const label = typeof value.label === 'string' ? value.label : '';

  if (value.kind === 'recurring' && typeof value.dayOfWeek === 'number') {
    const block: RecurringFreeBlock = {
      id: value.id,
      kind: 'recurring',
      dayOfWeek: value.dayOfWeek,
      startMinutes: value.startMinutes,
      endMinutes: value.endMinutes,
      label,
    };
    return block;
  }

  if (value.kind === 'oneoff' && typeof value.date === 'string') {
    const block: OneOffFreeBlock = {
      id: value.id,
      kind: 'oneoff',
      date: value.date,
      startMinutes: value.startMinutes,
      endMinutes: value.endMinutes,
      label,
    };
    return block;
  }

  return null;
}

function parseInvitation(value: unknown): Invitation | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.id !== 'string'
    || typeof value.friendId !== 'string'
    || typeof value.startAt !== 'string'
    || typeof value.endAt !== 'string'
    || typeof value.invitationText !== 'string'
    || typeof value.status !== 'string'
    || typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: value.id,
    friendId: value.friendId,
    startAt: value.startAt,
    endAt: value.endAt,
    idea: typeof value.idea === 'string' ? value.idea : 'catch up',
    place: typeof value.place === 'string' ? value.place : '',
    invitationText: value.invitationText,
    status: value.status as Invitation['status'],
    movedFromId: typeof value.movedFromId === 'string' ? value.movedFromId : null,
    createdAt: value.createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : value.createdAt,
  };
}

export function parseAppData(raw: string | null): AppData {
  if (!raw) {
    return emptyAppData();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return emptyAppData();
    }

    const friends = Array.isArray(parsed.friends)
      ? parsed.friends.map(parseFriend).filter((friend): friend is Friend => friend !== null)
      : [];
    const freeBlocks = Array.isArray(parsed.freeBlocks)
      ? parsed.freeBlocks.map(parseFreeBlock).filter((block): block is FreeBlock => block !== null)
      : [];
    const invitations = Array.isArray(parsed.invitations)
      ? parsed.invitations.map(parseInvitation).filter((invite): invite is Invitation => invite !== null)
      : [];

    return {
      onboardingComplete: Boolean(parsed.onboardingComplete) || friends.length > 0,
      friends,
      freeBlocks,
      invitations,
    };
  } catch {
    return emptyAppData();
  }
}

export async function loadAppData(): Promise<AppData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseAppData(raw);
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
