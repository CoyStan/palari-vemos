import { Text, TextInput, View, type TextInputProps } from "react-native";

import { color } from "../foundation";
import { cn } from "../ui/cn";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  className?: string;
};

export function TextField({
  label,
  hint,
  className,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: Props) {
  return (
    <View className="gap-2">
      <Text className="text-caption font-semibold text-ink">{label}</Text>
      <TextInput
        placeholderTextColor={color.muted}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={hint ?? accessibilityHint}
        className={cn(
          "min-h-[52px] rounded-control border border-border bg-surface px-4 py-3 text-body text-ink",
          className,
        )}
        style={style}
        {...rest}
      />
      {hint ? (
        <Text className="text-caption leading-[18px] text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}
