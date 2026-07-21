import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AppData,
  AppSettings,
  AvailabilityRule,
  Friend,
  Plan,
  SkippedOccurrence,
} from '../domain/types';
import { defaultSettings } from '../domain/types';

const STORAGE_KEY = 'sowhen.v1';

export const emptyAppData = (): AppData => ({
  onboardingComplete: false,
  friends: [],
  availability: [],
  skipped: [],
  plans: [],
  settings: defaultSettings(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSettings(value: unknown): AppSettings {
  const base = defaultSettings();
  if (!isRecord(value)) {
    return base;
  }
  return {
    ...base,
    ...Object.fromEntries(
      Object.keys(base).map((key) => {
        const typedKey = key as keyof AppSettings;
        return [typedKey, value[typedKey] ?? base[typedKey]];
      }),
    ),
  } as AppSettings;
}

function parseFriend(value: unknown): Friend | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    photoUri: typeof value.photoUri === 'string' ? value.photoUri : null,
    phone: typeof value.phone === 'string' ? value.phone : '',
    shareMethod: (typeof value.shareMethod === 'string' ? value.shareMethod : 'whatsapp') as Friend['shareMethod'],
    rhythm: (typeof value.rhythm === 'string' ? value.rhythm : 'monthly') as Friend['rhythm'],
    customDays: typeof value.customDays === 'number' ? value.customDays : 45,
    lastMetAt: typeof value.lastMetAt === 'string' || value.lastMetAt === null
      ? (value.lastMetAt as string | null)
      : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function parseAvailability(value: unknown): AvailabilityRule | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }
  return {
    id: value.id,
    kind: value.kind === 'oneoff' ? 'oneoff' : 'recurring',
    label: typeof value.label === 'string' ? value.label : '',
    daysOfWeek: Array.isArray(value.daysOfWeek)
      ? value.daysOfWeek.filter((day): day is number => typeof day === 'number')
      : [],
    startMinutes: typeof value.startMinutes === 'number' ? value.startMinutes : 18 * 60,
    endMinutes: typeof value.endMinutes === 'number' ? value.endMinutes : 20 * 60,
    recurrence: value.recurrence === 'biweekly' || value.recurrence === 'daily'
      ? value.recurrence
      : 'weekly',
    startDate: typeof value.startDate === 'string' ? value.startDate : formatFallbackDate(),
    endDate: typeof value.endDate === 'string' ? value.endDate : null,
    oneOffDate: typeof value.oneOffDate === 'string' ? value.oneOffDate : null,
    enabled: value.enabled !== false,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function formatFallbackDate(): string {
  const now = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function parsePlan(value: unknown): Plan | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.startAt !== 'string') {
    return null;
  }
  const friends = Array.isArray(value.friends)
    ? value.friends.filter(isRecord).map((item) => ({
      friendId: typeof item.friendId === 'string' ? item.friendId : '',
      status: (typeof item.status === 'string' ? item.status : 'not_invited') as Plan['friends'][number]['status'],
      invitationText: typeof item.invitationText === 'string' ? item.invitationText : '',
    })).filter((item) => item.friendId)
    : [];

  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : 'Catch up',
    activity: typeof value.activity === 'string' ? value.activity : '',
    place: typeof value.place === 'string' ? value.place : '',
    note: typeof value.note === 'string' ? value.note : '',
    startAt: value.startAt,
    endAt: typeof value.endAt === 'string' ? value.endAt : value.startAt,
    availabilityKey: typeof value.availabilityKey === 'string' ? value.availabilityKey : null,
    friends,
    status: (typeof value.status === 'string' ? value.status : 'draft') as Plan['status'],
    memoryNote: typeof value.memoryNote === 'string' ? value.memoryNote : '',
    memoryPhotoUri: typeof value.memoryPhotoUri === 'string' ? value.memoryPhotoUri : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
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
      ? parsed.friends.map(parseFriend).filter((item): item is Friend => item !== null)
      : [];
    const availability = Array.isArray(parsed.availability)
      ? parsed.availability.map(parseAvailability).filter((item): item is AvailabilityRule => item !== null)
      : [];
    const skipped = Array.isArray(parsed.skipped)
      ? parsed.skipped.filter(isRecord).map((item) => ({
        ruleId: String(item.ruleId ?? ''),
        date: String(item.date ?? ''),
      })).filter((item): item is SkippedOccurrence => Boolean(item.ruleId && item.date))
      : [];
    const plans = Array.isArray(parsed.plans)
      ? parsed.plans.map(parsePlan).filter((item): item is Plan => item !== null)
      : [];

    return {
      onboardingComplete: Boolean(parsed.onboardingComplete) || friends.length > 0,
      friends,
      availability,
      skipped,
      plans,
      settings: parseSettings(parsed.settings),
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

export async function exportAppDataJson(data: AppData): Promise<string> {
  return JSON.stringify(data, null, 2);
}

export async function clearAppData(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
