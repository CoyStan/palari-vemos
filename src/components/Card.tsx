import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { shadowLift, shadowSoft } from "../foundation";
import { cn } from "../ui/cn";

type Props = {
  children: ReactNode;
  className?: string;
  /** 'lift' for the single focused card on a screen. */
  elevation?: "soft" | "lift";
  style?: ViewStyle;
};

/** White surface with a soft teal-tinted shadow — the default card. */
export function Card({
  children,
  className,
  elevation = "soft",
  style,
}: Props) {
  return (
    <View
      className={cn("rounded-card bg-surface p-5", className)}
      style={[elevation === "lift" ? shadowLift : shadowSoft, style]}
    >
      {children}
    </View>
  );
}
