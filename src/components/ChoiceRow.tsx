import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space, type } from '../foundation';

type Option<T extends string | number> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T extends string | number> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ChoiceRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.list}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected ? styles.optionSelected : null,
                pressed ? styles.optionPressed : null,
              ]}
            >
              <Text style={[styles.optionLabel, selected ? styles.optionLabelSelected : null]}>
                {option.label}
              </Text>
              {option.hint ? (
                <Text style={[styles.hint, selected ? styles.hintSelected : null]}>
                  {option.hint}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  label: {
    color: color.ink,
    fontSize: type.caption,
    fontWeight: '600',
  },
  list: {
    gap: space.sm,
  },
  option: {
    minHeight: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  optionSelected: {
    borderColor: color.primary,
    backgroundColor: color.softTeal,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionLabel: {
    color: color.ink,
    fontSize: type.body,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: color.primary,
  },
  hint: {
    marginTop: 2,
    color: color.muted,
    fontSize: type.caption,
  },
  hintSelected: {
    color: color.primary,
  },
});
