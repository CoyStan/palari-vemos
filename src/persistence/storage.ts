import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData } from '../domain/types';
import { emptyAppData, migrateAndValidate, type LoadResult, SCHEMA_VERSION } from './migrate';

export { emptyAppData, SCHEMA_VERSION };
export type { LoadResult };

/** Primary on-device document. Legacy unversioned payloads also lived here. */
export const STORAGE_KEY = 'sowhen.v1';
export const BACKUP_KEY = 'sowhen.backup';

export async function loadAppData(): Promise<LoadResult> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      ok: false,
      reason: 'unreadable',
      message: 'Could not read local storage.',
      raw: null,
    };
  }

  const primary = migrateAndValidate(raw);
  if (primary.ok) {
    return primary;
  }

  let backupRaw: string | null = null;
  try {
    backupRaw = await AsyncStorage.getItem(BACKUP_KEY);
  } catch {
    return primary;
  }

  const backup = migrateAndValidate(backupRaw);
  if (backup.ok) {
    return {
      ...backup,
      warnings: [
        ...backup.warnings,
        'Restored from the last known good backup because the primary save was unreadable.',
      ],
    };
  }

  return primary;
}

export async function saveAppData(data: AppData): Promise<void> {
  const payload: AppData = { ...data, schemaVersion: SCHEMA_VERSION };
  const serialized = JSON.stringify(payload);
  await AsyncStorage.setItem(STORAGE_KEY, serialized);
  await AsyncStorage.setItem(BACKUP_KEY, serialized);
}

export async function exportAppDataJson(data: AppData): Promise<string> {
  return JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }, null, 2);
}

export async function clearAppData(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY, BACKUP_KEY]);
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Explicit empty start after recovery — clears corrupt primary so it cannot overwrite later. */
export async function startFreshStorage(): Promise<AppData> {
  const empty = emptyAppData();
  await clearAppData();
  await saveAppData(empty);
  return empty;
}
