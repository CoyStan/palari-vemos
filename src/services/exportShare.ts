import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";

import {
  shareJsonExportWithIo,
  type ExportShareResult,
} from "./exportShareCore";
import { deleteTempFile, writeTempExportJson } from "./media";

export type { ExportShareResult };
export { shareJsonExportWithIo } from "./exportShareCore";

/**
 * Share JSON export as a file when possible; text fallback otherwise.
 * Always deletes the temp file in finally.
 */
export async function shareJsonExport(
  json: string,
): Promise<ExportShareResult> {
  return shareJsonExportWithIo(json, {
    writeTemp: writeTempExportJson,
    deleteTemp: deleteTempFile,
    isAvailable: async () => {
      if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
      return Sharing.isAvailableAsync();
    },
    shareFile: async (uri) => {
      await Sharing.shareAsync(uri, {
        mimeType: "application/json",
        dialogTitle: "So, When? data export (photos not included)",
        UTI: "public.json",
      });
    },
    shareText: async (message) => {
      await Share.share({
        message,
        title: "So, When? data export (photos not included)",
      });
    },
  });
}
