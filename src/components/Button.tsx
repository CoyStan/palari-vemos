import {
  ActivityIndicator,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { color, shadowSoft } from "../foundation";
import { cn } from "../ui/cn";
import { PressableScale } from "./PressableScale";

type Variant = "primary" | "secondary" | "ghost" | "coral";

type Props = Omit<PressableProps, "style"> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const variantClass: Record<Variant, string> = {
  primary: "rounded-full bg-primary active:bg-primary-pressed",
  secondary: "rounded-full bg-primary-soft active:bg-primary-softBorder",
  ghost:
    "rounded-control border border-border bg-transparent active:bg-primary-soft",
  coral: "rounded-full bg-coral active:opacity-90",
};

const labelClass: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-primary",
  ghost: "text-ink",
  coral: "text-white",
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  className,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      className={cn(
        "min-h-[52px] items-center justify-center px-6",
        variantClass[variant],
        isDisabled && "opacity-50",
        className,
      )}
      style={[variant === "primary" && !isDisabled ? shadowSoft : null, style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "coral"
              ? color.primaryText
              : color.primary
          }
        />
      ) : (
        <Text className={cn("text-body font-semibold", labelClass[variant])}>
          {label}
        </Text>
      )}
    </PressableScale>
  );
}
