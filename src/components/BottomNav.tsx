import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, shadowSoft } from "../foundation";
import type { TabId } from "../state/AppProvider";
import { cn } from "../ui/cn";
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
      className="px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-row rounded-full bg-surface p-2" style={shadowSoft}>
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
      className="flex-1"
    >
      <View
        className={cn(
          "min-h-[52px] items-center justify-center gap-1 rounded-full px-2",
          active && "bg-primary-soft",
        )}
      >
        <Icon name={icon} size={22} color={tint} />
        <Text
          className={cn(
            "text-center text-caption font-sans-semibold leading-4",
            active ? "text-primary" : "text-muted",
          )}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
