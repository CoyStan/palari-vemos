import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { minutesToDate } from '../domain/pickerTime';

type Props = {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  timeFormat24h?: boolean;
};

function minutesToDayjs(minutes: number): Dayjs {
  const date = minutesToDate(minutes);
  return dayjs(date);
}

function dayjsToMinutes(value: Dayjs | null): number {
  if (!value || !value.isValid()) {
    return 0;
  }
  return value.hour() * 60 + value.minute();
}

/** MUI X TimePicker — web only; opens clock popup on tap (no text editing). */
export function TimeSlotPicker({ label, minutes, onChange, timeFormat24h = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-1" accessibilityLabel={label}>
      <Text className="text-caption font-sans-semibold text-ink">{label}</Text>
      <TimePicker
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        value={minutesToDayjs(minutes)}
        onChange={(value) => {
          onChange(dayjsToMinutes(value));
        }}
        ampm={!timeFormat24h}
        slotProps={{
          textField: {
            fullWidth: true,
            size: 'medium',
            onClick: () => setOpen(true),
            readOnly: true,
          },
          popper: {
            placement: 'bottom-start',
          },
        }}
      />
    </View>
  );
}
