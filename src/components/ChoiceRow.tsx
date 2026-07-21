import { Pressable, Text, View } from 'react-native';

import { cn } from '../ui/cn';

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
    <View className="gap-2">
      <Text className="text-caption font-semibold text-ink">{label}</Text>
      <View className="gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              className={cn(
                'min-h-[52px] justify-center rounded-control border bg-surface px-4 py-3 active:opacity-85',
                selected ? 'border-primary bg-primary-soft' : 'border-border',
              )}
            >
              <Text
                className={cn(
                  'text-body font-semibold',
                  selected ? 'text-primary' : 'text-ink',
                )}
              >
                {option.label}
              </Text>
              {option.hint ? (
                <Text
                  className={cn(
                    'mt-0.5 text-caption',
                    selected ? 'text-primary' : 'text-muted',
                  )}
                >
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
