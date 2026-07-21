import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatDateKey } from '../domain/time';
import { hapticTick } from '../services/haptics';
import { cn } from '../ui/cn';

type Props = {
  label: string;
  date: string;
  onChange: (date: string) => void;
};

function parseDateKey(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(date: string): string {
  const parsed = parseDateKey(date);
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Native date picker — system dialog on Android. */
export function DateSlotPicker({ label, date, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'dismissed' || !picked) {
      return;
    }
    onChange(formatDateKey(picked));
  };

  return (
    <View className="gap-1">
      <Text className="text-caption font-sans-semibold text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatDisplayDate(date)}`}
        onPress={() => {
          hapticTick();
          setOpen(true);
        }}
        className={cn(
          'min-h-[52px] justify-center rounded-control border border-border bg-surface px-4 py-3 active:bg-primary-soft',
        )}
      >
        <Text className="font-sans-semibold text-body text-ink">
          {formatDisplayDate(date)}
        </Text>
      </Pressable>

      {open ? (
        <DateTimePicker
          value={parseDateKey(date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' && open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done choosing date"
          onPress={() => setOpen(false)}
          className="min-h-[44px] items-center justify-center rounded-full bg-primary-soft px-4 py-2"
        >
          <Text className="font-sans-semibold text-caption text-primary">Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
