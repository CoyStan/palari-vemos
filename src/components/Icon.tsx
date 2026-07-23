import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Platform } from "react-native";

import { color } from "../foundation";

type FeatherName = ComponentProps<typeof Feather>["name"];

/** Outline icon set (ui-ux-pro-max: no emoji as structural icons). */
export type IconName =
  | "calendar"
  | "users"
  | "chevron-left"
  | "chevron-right"
  | "x"
  | "plus"
  | "clock"
  | "arrow-left"
  | "settings"
  | "share"
  | "trash-2"
  | "check"
  | "sun"
  | "pause-circle";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
};

export function Icon({
  name,
  size = 22,
  color: tint = color.ink,
  accessibilityLabel,
}: Props) {
  return (
    <Feather
      name={name as FeatherName}
      size={size}
      color={tint}
      accessibilityLabel={accessibilityLabel}
      // Keep glyph inside a square box so icons (esp. x) optically center in circles.
      style={{
        width: size,
        height: size,
        textAlign: "center",
        lineHeight: size,
        ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
      }}
    />
  );
}
