/**
 * So, When? visual tokens — keep in sync with tailwind.config.js theme.extend.
 * Use these for JS-driven styles (calendar chips, absolute layout math).
 * Prefer NativeWind className for static UI.
 */
import type { ViewStyle } from "react-native";

export const color = {
  canvas: "#FAF8F5",
  surface: "#FFFFFF",
  ink: "#2A2C31",
  muted: "#6B7280",
  border: "#EBE5DF",
  primary: "#147A78",
  primaryPressed: "#0F6261",
  primaryText: "#FFFFFF",
  softTeal: "#E7F5F4",
  softTealBorder: "#B7E0DD",
  coral: "#F28C78",
  coralDeep: "#A94C3E",
  softCoral: "#FFF0EC",
  softCoralBorder: "#F5C4B8",
  success: "#15803D",
  danger: "#B42318",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  control: 14,
  card: 20,
  sheet: 24,
  pill: 999,
} as const;

export const type = {
  caption: 13,
  body: 16,
  section: 20,
  title: 32,
  display: 38,
} as const;

/**
 * Soft, teal-tinted elevation. Shadows (not borders) carry primary surfaces;
 * borders stay for inputs and secondary UI. Keep opacity low — calm, not floaty.
 */
export const shadowSoft: ViewStyle = {
  shadowColor: "#147A78",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};

/** Slightly deeper lift for the single focused card on a screen. */
export const shadowLift: ViewStyle = {
  shadowColor: "#147A78",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 5,
};
