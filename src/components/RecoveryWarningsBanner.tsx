import { Pressable, Text, View } from "react-native";

import { useApp } from "../state/AppProvider";

/** Surfaces migrate/heal warnings instead of silently dropping malformed records. */
export function RecoveryWarningsBanner() {
  const { recoveryWarnings, dismissRecoveryWarnings } = useApp();

  if (recoveryWarnings.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      className="mb-3 gap-2 rounded-control border border-border bg-surface px-3 py-3"
    >
      <Text className="font-sans-semibold text-caption text-ink">
        Data notice
      </Text>
      {recoveryWarnings.map((warning) => (
        <Text key={warning} className="text-caption text-muted">
          {warning}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss data notice"
        onPress={dismissRecoveryWarnings}
        className="min-h-[44px] justify-center self-start"
      >
        <Text className="font-sans-semibold text-caption text-primary">
          Got it
        </Text>
      </Pressable>
    </View>
  );
}
