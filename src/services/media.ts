import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const MEDIA_DIR_NAME = 'sowhen-media';

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

export function isOwnedMediaUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.includes(`/${MEDIA_DIR_NAME}/`);
}

export async function copyIntoOwnedMedia(
  sourceUri: string,
  kind: 'friend' | 'memory' | 'contact',
): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }
  try {
    const root = await ensureMediaDir();
    if (!root) return sourceUri;
    const ext = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
    const name = `${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const dest = `${root}${name}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    return sourceUri;
  }
}

export async function deleteOwnedMedia(uri: string | null | undefined): Promise<void> {
  if (!uri || !isOwnedMediaUri(uri) || Platform.OS === 'web') return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function clearOwnedMediaDirectory(): Promise<void> {
  if (Platform.OS === 'web') return;
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
  if (Platform.OS === 'web') return;
  const root = mediaRoot();
  if (!root) return;
  try {
    const info = await FileSystem.getInfoAsync(root);
    if (!info.exists) return;
    const keep = new Set(referenced.filter((uri): uri is string => Boolean(uri)));
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

export async function consumePendingImagePickerResult(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const pending = await ImagePicker.getPendingResultAsync();
    if (!pending || ('canceled' in pending && pending.canceled)) return null;
    if ('assets' in pending && pending.assets?.[0]?.uri) {
      return pending.assets[0].uri;
    }
  } catch {
    return null;
  }
  return null;
}

export async function writeTempExportJson(json: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const cache = FileSystem.cacheDirectory;
  if (!cache) return null;
  try {
    const uri = `${cache}sowhen-export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
    return uri;
  } catch {
    return null;
  }
}

export async function deleteTempFile(uri: string | null | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}
