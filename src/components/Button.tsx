import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { color, radius, space, type } from '../foundation';

type Variant = 'primary' | 'secondary' | 'ghost' | 'coral';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles[`${variant}Pressed` as const] : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'coral' ? color.primaryText : color.primary} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as const]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.control,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: color.primary,
  },
  primaryPressed: {
    backgroundColor: color.primaryPressed,
  },
  primaryLabel: {
    color: color.primaryText,
  },
  secondary: {
    backgroundColor: color.softTeal,
  },
  secondaryPressed: {
    backgroundColor: '#D8EFED',
  },
  secondaryLabel: {
    color: color.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: color.border,
  },
  ghostPressed: {
    backgroundColor: color.softTeal,
  },
  ghostLabel: {
    color: color.ink,
  },
  coral: {
    backgroundColor: color.coral,
  },
  coralPressed: {
    backgroundColor: '#E07A68',
  },
  coralLabel: {
    color: color.primaryText,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: type.body,
    fontWeight: '600',
  },
});
