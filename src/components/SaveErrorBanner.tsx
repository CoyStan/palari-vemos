import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "./Button";
import { useApp } from "../state/AppProvider";

/** Persistent across navigation — successful screen changes must not hide a failed save. */
export function SaveErrorBanner() {
  const { saveError, retrySave } = useApp();
  const insets = useSafeAreaInsets();

  if (!saveError) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      className="border-t border-danger bg-surface px-4 py-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Text className="font-sans-semibold text-body text-danger">
        Couldn’t save changes
      </Text>
      <Text className="mt-1 text-caption text-muted">{saveError}</Text>
      <View className="mt-3">
        <Button
          label="Retry"
          variant="secondary"
          onPress={() => void retrySave()}
        />
      </View>
    </View>
  );
}
