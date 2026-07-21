import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { formatClock } from '../domain/model';
import { dateToMinutes, minutesToDate } from '../domain/pickerTime';
import { hapticTick } from '../services/haptics';
import { cn } from '../ui/cn';

type Props = {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  timeFormat24h?: boolean;
};

/** Native time picker — opens the system dialog to avoid nested scroll. */
export function TimeSlotPicker({
  label,
  minutes,
  onChange,
  timeFormat24h = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const value = minutesToDate(minutes);

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'dismissed' || !date) {
      return;
    }
    onChange(dateToMinutes(date));
  };

  return (
    <View className="gap-1">
      <Text className="text-caption font-sans-semibold text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatClock(minutes, timeFormat24h)}`}
        onPress={() => {
          hapticTick();
          setOpen(true);
        }}
        className={cn(
          'min-h-[52px] justify-center rounded-control border border-border bg-surface px-4 py-3 active:bg-primary-soft',
        )}
      >
        <Text className="font-sans-semibold text-body text-ink">
          {formatClock(minutes, timeFormat24h)}
        </Text>
      </Pressable>

      {open ? (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour={timeFormat24h}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' && open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done choosing time"
          onPress={() => setOpen(false)}
          className="min-h-[44px] items-center justify-center rounded-full bg-primary-soft px-4 py-2"
        >
          <Text className="font-sans-semibold text-caption text-primary">Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
