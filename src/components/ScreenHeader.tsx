import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { color } from "../foundation";
import { Icon } from "./Icon";

type Props = {
  title: string;
  onBack: () => void;
  right?: ReactNode;
};

export function ScreenHeader({ title, onBack, right }: Props) {
  return (
    <View className="mb-4 flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft active:bg-primary-softBorder"
      >
        <Icon name="arrow-left" size={22} color={color.primary} />
      </Pressable>
      <Text className="flex-1 font-sans-bold text-title tracking-[-0.4px] text-ink">
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}
