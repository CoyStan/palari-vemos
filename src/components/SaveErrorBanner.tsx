import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "./Button";
import { useApp } from "../state/AppProvider";

/**
 * Persistent across navigation.
 * Persist errors: Retry repeats the failed op (save/wipe/startFresh).
 * Reminder API errors are separate and do not trigger a persistence retry.
 */
export function SaveErrorBanner() {
  const { persistError, reminderError, retryPersist, dismissReminderError } =
    useApp();
  const insets = useSafeAreaInsets();

  if (!persistError && !reminderError) {
    return null;
  }

  if (persistError) {
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
        <Text className="font-sans-semibold text-body text-danger">
          {title}
        </Text>
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

  return (
    <View
      accessibilityLiveRegion="polite"
      className="border-t border-border bg-surface px-4 py-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Text className="font-sans-semibold text-body text-ink">
        Couldn’t update reminders
      </Text>
      <Text className="mt-1 text-caption text-muted">{reminderError}</Text>
      <View className="mt-3">
        <Button
          label="Dismiss"
          variant="secondary"
          onPress={dismissReminderError}
        />
      </View>
    </View>
  );
}
