import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, shadowSoft } from "../foundation";
import type { TabId } from "../state/AppProvider";
import { Icon } from "./Icon";

type Props = {
  active: TabId;
  onWhen: () => void;
  onFriends: () => void;
  onSettings: () => void;
};

export function BottomNav({ active, onWhen, onFriends, onSettings }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-canvas px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        className="flex-row rounded-full bg-surface p-2"
        style={[{ overflow: "hidden" }, shadowSoft]}
      >
        <NavItem
          label="When"
          icon="calendar"
          active={active === "when"}
          onPress={onWhen}
        />
        <NavItem
          label="Friends"
          icon="users"
          active={active === "friends"}
          onPress={onFriends}
        />
        <NavItem
          label="Settings"
          icon="settings"
          active={active === "settings"}
          onPress={onSettings}
        />
      </View>
    </View>
  );
}

function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: "calendar" | "users" | "settings";
  active: boolean;
  onPress: () => void;
}) {
  const tint = active ? color.primary : color.muted;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      style={{ flex: 1 }}
    >
      <View
        style={{
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderRadius: 999,
          paddingHorizontal: 8,
          // Solid style (not className swap) avoids a one-frame NativeWind flash.
          backgroundColor: active ? color.softTeal : "transparent",
          overflow: "hidden",
        }}
      >
        <Icon name={icon} size={22} color={tint} />
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            lineHeight: 16,
            fontFamily: "Quicksand_600SemiBold",
            color: tint,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
