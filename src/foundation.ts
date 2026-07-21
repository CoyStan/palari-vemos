/**
 * Vemos's small, native-first visual foundation.
 *
 * The calm slate + teal language is derived from the existing Palari frontend;
 * keep it restrained so friends, plans, and a single next action stay central.
 */
export const color = {
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  ink: '#1F2937',
  muted: '#64748B',
  border: '#E2E8F0',
  primary: '#147A78',
  primaryPressed: '#0F6261',
  primaryText: '#FFFFFF',
  softTeal: '#E7F5F4',
  coral: '#F28C78',
  softCoral: '#FFF0EC',
  success: '#15803D',
  danger: '#B42318',
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
  control: 12,
  card: 16,
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
