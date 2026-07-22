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

export type KeyRead =
  | { status: "absent" }
  | { status: "unreadable"; message: string }
  | { status: "present"; raw: string };

export async function readStorageKey(
  key: string,
  adapter: StorageAdapter = defaultAdapter,
): Promise<KeyRead> {
  try {
    const raw = await adapter.getItem(key);
    if (isAbsentRaw(raw)) {
      return { status: "absent" };
    }
    return { status: "present", raw: raw as string };
  } catch (error) {
    return {
      status: "unreadable",
      message:
        error instanceof Error
          ? error.message
          : "Could not read local storage.",
    };
  }
}

function isIncompatible(
  result: LoadResult | null,
): result is Extract<LoadResult, { ok: false; reason: "incompatible" }> {
  return Boolean(result && !result.ok && result.reason === "incompatible");
}

async function healFromBackup(
  backup: Extract<LoadResult, { ok: true }>,
  warning: string,
  adapter: StorageAdapter,
): Promise<LoadResult> {
  try {
    await saveAppData(backup.data, adapter);
  } catch {
    /* heal best-effort; still return backup data — never leave future schemas */
  }
  return {
    ...backup,
    healedFromBackup: true,
    warnings: [...backup.warnings, warning],
  };
}

/**
 * Load with primary/backup matrix.
 * Future/incompatible schema in either key is authoritative — never overwrite it.
 */
export async function loadAppData(
  adapter: StorageAdapter = defaultAdapter,
): Promise<LoadResult> {
  const primaryRead = await readStorageKey(STORAGE_KEY, adapter);
  const backupRead = await readStorageKey(BACKUP_KEY, adapter);

  if (primaryRead.status === "absent" && backupRead.status === "absent") {
    return { ok: true, data: emptyAppData(), warnings: [] };
  }

  // Missing primary + backup read failure is not a fresh install.
  if (primaryRead.status === "absent" && backupRead.status === "unreadable") {
    return {
      ok: false,
      reason: "unreadable",
      message: "Could not read the backup save, and no primary save was found.",
      raw: null,
    };
  }

  const primary =
    primaryRead.status === "present"
      ? migrateAndValidate(primaryRead.raw)
      : null;
  const backup =
    backupRead.status === "present" ? migrateAndValidate(backupRead.raw) : null;

  // Incompatible anywhere wins — zero writes, never downgrade.
  if (isIncompatible(primary)) {
    return primary;
  }
  if (isIncompatible(backup)) {
    return backup;
  }

  if (primary?.ok) {
    return primary;
  }

  // Primary read failed at IO layer but backup is valid → recover with warning.
  if (primaryRead.status === "unreadable" && backup?.ok) {
    return healFromBackup(
      backup,
      "Restored from backup because the primary save could not be read.",
      adapter,
    );
  }

  // Both unreadable.
  if (
    primaryRead.status === "unreadable" &&
    (backupRead.status === "unreadable" || backupRead.status === "absent")
  ) {
    return {
      ok: false,
      reason: "unreadable",
      message: "Could not read local storage.",
      raw: null,
    };
  }

  if (backup?.ok) {
    const warning =
      primaryRead.status === "absent"
        ? "Restored from backup because the primary save was missing."
        : "Restored from the last known good backup because the primary save could not be used.";
    return healFromBackup(backup, warning, adapter);
  }

  if (primary && !primary.ok) {
    return primary;
  }
  if (backup && !backup.ok) {
    return backup;
  }

  if (primaryRead.status === "absent" && backupRead.status === "present") {
    return {
      ok: false,
      reason: "corrupt",
      message: "Your backup save could not be recovered.",
      raw: backupRead.raw,
    };
  }

  return {
    ok: false,
    reason: "corrupt",
    message: "Your saved data could not be recovered.",
    raw:
      primaryRead.status === "present"
        ? primaryRead.raw
        : backupRead.status === "present"
          ? backupRead.raw
          : null,
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
