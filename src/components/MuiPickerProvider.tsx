import type { ReactNode } from 'react';

/** Native/Android: MUI pickers are web-only; pass children through. */
export function MuiPickerProvider({ children }: { children: ReactNode }) {
  return children;
}
