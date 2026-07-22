import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "./Button";
import { useApp } from "../state/AppProvider";

/** Persistent across navigation — Retry repeats the failed op (save/wipe/startFresh). */
export function SaveErrorBanner() {
  const { persistError, retryPersist } = useApp();
  const insets = useSafeAreaInsets();

  if (!persistError) {
    return null;
  }

  const title =
    persistError.op === "wipe"
      ? "Couldn’t delete data"
      : persistError.op === "startFresh"
        ? "Couldn’t start fresh"
        : "Couldn’t save changes";

  return (
    <View
      accessibilityLiveRegion="polite"
      className="border-t border-danger bg-surface px-4 py-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Text className="font-sans-semibold text-body text-danger">{title}</Text>
      <Text className="mt-1 text-caption text-muted">
        {persistError.message}
      </Text>
      <View className="mt-3">
        <Button
          label="Retry"
          variant="secondary"
          onPress={() => void retryPersist()}
        />
      </View>
    </View>
  );
}
