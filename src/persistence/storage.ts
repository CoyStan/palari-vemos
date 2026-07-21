import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AppData } from "../domain/types";
import {
  emptyAppData,
  isAbsentRaw,
  migrateAndValidate,
  type LoadResult,
  SCHEMA_VERSION,
} from "./migrate";

export { emptyAppData, SCHEMA_VERSION };
export type { LoadResult };

/** Primary on-device document. Legacy unversioned payloads also lived here. */
export const STORAGE_KEY = "sowhen.v1";
export const BACKUP_KEY = "sowhen.backup";

export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  multiRemove: (keys: string[]) => Promise<void>;
};

const defaultAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),
};

/**
 * Load with primary/backup matrix:
 * - absent+absent → empty
 * - valid primary → primary
 * - invalid/absent primary + valid backup → backup + heal primary
 * - invalid primary + absent/invalid backup → Recovery error
 * - future schema → incompatible Recovery error
 */
export async function loadAppData(
  adapter: StorageAdapter = defaultAdapter,
): Promise<LoadResult> {
  let primaryRaw: string | null = null;
  let backupRaw: string | null = null;

  try {
    primaryRaw = await adapter.getItem(STORAGE_KEY);
  } catch {
    return {
      ok: false,
      reason: "unreadable",
      message: "Could not read local storage.",
      raw: null,
    };
  }

  try {
    backupRaw = await adapter.getItem(BACKUP_KEY);
  } catch {
    backupRaw = null;
  }

  const primaryAbsent = isAbsentRaw(primaryRaw);
  const backupAbsent = isAbsentRaw(backupRaw);

  if (primaryAbsent && backupAbsent) {
    return { ok: true, data: emptyAppData(), warnings: [] };
  }

  const primary = primaryAbsent ? null : migrateAndValidate(primaryRaw);

  if (primary?.ok) {
    return primary;
  }

  const backup = backupAbsent ? null : migrateAndValidate(backupRaw);

  if (backup?.ok) {
    try {
      await saveAppData(backup.data, adapter);
    } catch {
      /* heal best-effort; still return backup data */
    }
    return {
      ...backup,
      healedFromBackup: true,
      warnings: [
        ...backup.warnings,
        primaryAbsent
          ? "Restored from backup because the primary save was missing."
          : "Restored from the last known good backup because the primary save was unreadable.",
      ],
    };
  }

  if (primary && !primary.ok) {
    return primary;
  }
  if (backup && !backup.ok) {
    return backup;
  }

  return {
    ok: false,
    reason: "corrupt",
    message: "Your saved data could not be recovered.",
    raw: primaryRaw ?? backupRaw,
  };
}

export async function saveAppData(
  data: AppData,
  adapter: StorageAdapter = defaultAdapter,
): Promise<void> {
  const payload: AppData = { ...data, schemaVersion: SCHEMA_VERSION };
  const serialized = JSON.stringify(payload);
  await adapter.setItem(STORAGE_KEY, serialized);
  await adapter.setItem(BACKUP_KEY, serialized);
}

export async function exportAppDataJson(data: AppData): Promise<string> {
  return JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }, null, 2);
}

export async function clearAppData(
  adapter: StorageAdapter = defaultAdapter,
): Promise<void> {
  await adapter.multiRemove([STORAGE_KEY, BACKUP_KEY]);
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function startFreshStorage(
  adapter: StorageAdapter = defaultAdapter,
): Promise<AppData> {
  const empty = emptyAppData();
  await clearAppData(adapter);
  await saveAppData(empty, adapter);
  return empty;
}
