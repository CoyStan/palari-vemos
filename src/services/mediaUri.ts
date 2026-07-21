const EXT_ALLOWLIST = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const MEDIA_DIR_NAME = "sowhen-media";

/** Sanitize extension from MIME or a clean path — never trust content:// path segments. */
export function resolveOwnedMediaExtension(input: {
  sourceUri: string;
  mimeType?: string | null;
}): string | null {
  const mime = input.mimeType?.toLowerCase().trim();
  if (mime && MIME_TO_EXT[mime]) {
    return MIME_TO_EXT[mime];
  }
  if (/^(file|https?):/i.test(input.sourceUri)) {
    const withoutQuery = input.sourceUri.split("?")[0] ?? "";
    const match = withoutQuery.match(/\.([a-z0-9]{2,5})$/i);
    if (match) {
      const ext = match[1]!.toLowerCase();
      if (ext === "jpeg") return "jpg";
      if (EXT_ALLOWLIST.has(ext)) return ext;
    }
  }
  if (/^content:/i.test(input.sourceUri)) {
    return "jpg";
  }
  return null;
}

export function isOwnedMediaUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.includes(`/${MEDIA_DIR_NAME}/`);
}
