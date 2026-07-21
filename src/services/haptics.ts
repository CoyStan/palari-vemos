import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Quiet tactile feedback for the moments that matter (design-system:
 * motion dial 4/10 — felt, not flashy). No-op on web/unsupported.
 */
const supported = Platform.OS === "ios" || Platform.OS === "android";

/** Light tick — selections, toggles, chip presses. */
export function hapticTick(): void {
  if (supported) {
    void Haptics.selectionAsync();
  }
}

/** Soft thud — sheets opening, invites shared, plan created. */
export function hapticSoft(): void {
  if (supported) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** Warm pulse — plan is on, plan done, memory saved. */
export function hapticCelebrate(): void {
  if (supported) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
