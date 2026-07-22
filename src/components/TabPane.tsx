import type { ReactNode } from "react";
import { View } from "react-native";

/**
 * Keeps a tab screen mounted while hidden so tab switches do not remount
 * or run enter animations (no opacity flash / layout blink).
 */
export function TabPane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <View
      collapsable={false}
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={{
        flex: 1,
        display: active ? "flex" : "none",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
