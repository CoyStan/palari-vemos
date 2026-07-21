import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import {
  isOwnedMediaUri,
  MEDIA_DIR_NAME,
  resolveOwnedMediaExtension,
} from "./mediaUri";

export {
  isOwnedMediaUri,
  MEDIA_DIR_NAME,
  resolveOwnedMediaExtension,
} from "./mediaUri";

export type MediaCopyErrorCode = "unsupported" | "copy_failed" | "unavailable";

export type MediaCopyResult =
  | { ok: true; uri: string }
  | { ok: false; code: MediaCopyErrorCode; message: string };

function mediaRoot(): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}${MEDIA_DIR_NAME}/`;
}

async function ensureMediaDir(): Promise<string | null> {
  const root = mediaRoot();
  if (!root) return null;
  const info = await FileSystem.getInfoAsync(root);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  }
  return root;
}

export async function copyIntoOwnedMedia(
  sourceUri: string,
  kind: "friend" | "memory" | "contact",
  mimeType?: string | null,
): Promise<MediaCopyResult> {
  if (Platform.OS === "web") {
    return { ok: true, uri: sourceUri };
  }
  const ext = resolveOwnedMediaExtension({ sourceUri, mimeType });
  if (!ext) {
    return {
      ok: false,
      code: "unsupported",
      message: "That image type isn’t supported. Try a JPG or PNG.",
    };
  }
  try {
    const root = await ensureMediaDir();
    if (!root) {
      return {
        ok: false,
        code: "unavailable",
        message: "Could not access app storage for photos.",
      };
    }
    const name = `${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const dest = `${root}${name}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return { ok: true, uri: dest };
  } catch {
    return {
      ok: false,
      code: "copy_failed",
      message: "Could not save that photo into So, When?. Try again.",
    };
  }
}

export async function deleteOwnedMedia(
  uri: string | null | undefined,
): Promise<void> {
  if (!uri || !isOwnedMediaUri(uri) || Platform.OS === "web") return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function clearOwnedMediaDirectory(): Promise<void> {
  if (Platform.OS === "web") return;
  const root = mediaRoot();
  if (!root) return;
  try {
    await FileSystem.deleteAsync(root, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function garbageCollectOwnedMedia(
  referenced: Array<string | null | undefined>,
): Promise<void> {
  if (Platform.OS === "web") return;
  const root = mediaRoot();
  if (!root) return;
  try {
    const info = await FileSystem.getInfoAsync(root);
    if (!info.exists) return;
    const keep = new Set(
      referenced.filter(
        (uri): uri is string => Boolean(uri) && isOwnedMediaUri(uri),
      ),
    );
    const entries = await FileSystem.readDirectoryAsync(root);
    await Promise.all(
      entries.map(async (name) => {
        const uri = `${root}${name}`;
        if (!keep.has(uri)) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }),
    );
  } catch {
    /* ignore */
  }
}

export async function writeTempExportJson(
  json: string,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const cache = FileSystem.cacheDirectory;
  if (!cache) return null;
  try {
    const uri = `${cache}sowhen-export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return uri;
  } catch {
    return null;
  }
}

export async function deleteTempFile(
  uri: string | null | undefined,
): Promise<void> {
  if (!uri || Platform.OS === "web") return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

/**
 * Android activity destruction can return a pending ImagePicker result.
 * Callers must pass the intended target (friend | memory) themselves — this helper
 * only returns a raw URI when present. Documented limitation: Expo does not tag
 * which picker flow produced the pending result.
 */
export async function consumePendingImagePickerResult(): Promise<
  string | null
> {
  // Intentionally not auto-wired: without a tracked picker target we risk writing
  // the wrong photo into friend vs memory. Prefer explicit pickers on each screen.
  return null;
}
