import { StyleSheet, Text, View } from 'react-native';

type Props = {
  name: string;
  size?: number;
};

const PALETTES = [
  { bg: '#E7F5F4', fg: '#147A78' },
  { bg: '#FFF0EC', fg: '#C96B5A' },
  { bg: '#EEF2FF', fg: '#4F46E5' },
  { bg: '#F0FDF4', fg: '#15803D' },
  { bg: '#FFF7ED', fg: '#C2410C' },
];

export function Avatar({ name, size = 48 }: Props) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const palette = PALETTES[name.trim().length % PALETTES.length] ?? PALETTES[0];

  return (
    <View
      accessibilityLabel={`${name} avatar`}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
        },
      ]}
    >
      <Text style={[styles.initial, { color: palette.fg, fontSize: size * 0.4 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
  },
});
