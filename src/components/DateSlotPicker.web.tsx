import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { Text, View } from "react-native";

import { formatDateKey } from "../domain/time";

type Props = {
  label: string;
  date: string;
  onChange: (date: string) => void;
};

function dateToDayjs(date: string): Dayjs {
  return dayjs(date);
}

/** MUI X DatePicker — opens calendar popup on tap (no text editing). */
export function DateSlotPicker({ label, date, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-1" accessibilityLabel={label}>
      <Text className="text-caption font-sans-semibold text-ink">{label}</Text>
      <DatePicker
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        value={dateToDayjs(date)}
        onChange={(value) => {
          if (value?.isValid()) {
            onChange(formatDateKey(value.toDate()));
          }
        }}
        disablePast
        slotProps={{
          textField: {
            fullWidth: true,
            size: "medium",
            onClick: () => setOpen(true),
            readOnly: true,
          },
          popper: {
            placement: "bottom-start",
          },
        }}
      />
    </View>
  );
}
