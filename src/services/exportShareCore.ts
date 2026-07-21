export type ExportShareResult = {
  ok: boolean;
  message?: string;
};

/** Pure export flow for tests — injectable IO, always deletes temp in finally. */
export async function shareJsonExportWithIo(
  json: string,
  io: {
    writeTemp: (json: string) => Promise<string | null>;
    deleteTemp: (uri: string | null) => Promise<void>;
    isAvailable: () => Promise<boolean>;
    shareFile: (uri: string) => Promise<void>;
    shareText: (json: string) => Promise<void>;
  },
): Promise<ExportShareResult> {
  let tempUri: string | null = null;
  try {
    tempUri = await io.writeTemp(json);
    if (tempUri && (await io.isAvailable())) {
      await io.shareFile(tempUri);
      return { ok: true };
    }
    await io.shareText(json);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not share the export.",
    };
  } finally {
    await io.deleteTemp(tempUri);
  }
}
