import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { Button } from "../components/Button";
import { DateSlotPicker } from "../components/DateSlotPicker";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TimeSlotPicker } from "../components/TimeSlotPicker";
import { dateAtMinutes, formatDateKey } from "../domain/time";
import type { ConcreteSlot } from "../domain/types";
import { useApp } from "../state/AppProvider";

function buildAdhocSlot(
  dateKey: string,
  startMinutes: number,
  endMinutes: number,
): ConcreteSlot {
  return {
    key: `adhoc:${dateKey}:${startMinutes}`,
    ruleId: null,
    date: dateKey,
    startMinutes,
    endMinutes,
    startAt: dateAtMinutes(dateKey, startMinutes).toISOString(),
    endAt: dateAtMinutes(dateKey, endMinutes).toISOString(),
    label: "Your pick",
  };
}

export function PickPlanTimeScreen() {
  const { data, selectedFriendIds, openCreatePlan, goBack } = useApp();
  const today = formatDateKey(new Date());
  const defaultDuration = data.settings.defaultDurationMinutes;
  const [dateKey, setDateKey] = useState(today);
  const [startMinutes, setStartMinutes] = useState(19 * 60);
  const [endMinutes, setEndMinutes] = useState(19 * 60 + defaultDuration);

  const preview = useMemo(
    () => buildAdhocSlot(dateKey, startMinutes, endMinutes),
    [dateKey, startMinutes, endMinutes],
  );

  const onContinue = () => {
    if (endMinutes <= startMinutes) {
      Alert.alert(
        "Check the times",
        "End needs to be after the start, on the same day.",
      );
      return;
    }
    openCreatePlan(preview, selectedFriendIds, { replace: true });
  };

  return (
    <Screen contentClassName="gap-5">
      <ScreenHeader title="Pick a time" onBack={goBack} />
      <Text className="text-body text-muted">
        Choose when you’d like to meet — you don’t need free time marked first.
      </Text>
      <DateSlotPicker label="Date" date={dateKey} onChange={setDateKey} />
      <TimeSlotPicker
        label="Start"
        minutes={startMinutes}
        onChange={(minutes) => {
          setStartMinutes(minutes);
          if (endMinutes <= minutes) {
            setEndMinutes(
              Math.min(24 * 60, minutes + Math.max(30, defaultDuration)),
            );
          }
        }}
        timeFormat24h={data.settings.timeFormat24h}
      />
      <TimeSlotPicker
        label="End"
        minutes={endMinutes}
        onChange={setEndMinutes}
        timeFormat24h={data.settings.timeFormat24h}
      />
      <View className="gap-2">
        <Button label="Continue" onPress={onContinue} />
        <Button label="Cancel" variant="ghost" onPress={goBack} />
      </View>
    </Screen>
  );
}
