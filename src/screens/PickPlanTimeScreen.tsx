import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DateSlotPicker } from "../components/DateSlotPicker";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TimeSlotPicker } from "../components/TimeSlotPicker";
import { addDays, dateAtMinutes, formatDateKey } from "../domain/time";
import type { ConcreteSlot } from "../domain/types";
import { hapticTick } from "../services/haptics";
import { useApp } from "../state/AppProvider";
import { cn } from "../ui/cn";

type PresetId = "tonight" | "tomorrow" | "weekend" | "custom";

const PRESETS: { id: PresetId; label: string; hint: string }[] = [
  { id: "tonight", label: "Tonight", hint: "Tonight · 7 PM" },
  { id: "tomorrow", label: "Tomorrow evening", hint: "Tomorrow · 7 PM" },
  { id: "weekend", label: "This weekend", hint: "Saturday · 2 PM" },
  { id: "custom", label: "Custom", hint: "Your date & time" },
];

function nextSaturday(from: Date): Date {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = start.getDay();
  if (day === 6) {
    return start;
  }
  return addDays(start, (6 - day + 7) % 7);
}

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

function firstName(name: string): string {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  return space === -1 ? trimmed : trimmed.slice(0, space);
}

export function PickPlanTimeScreen() {
  const {
    data,
    selectedFriendIds,
    sortedFriends,
    toggleFriendSelection,
    openCreatePlan,
    openAddFriendForPlan,
    goBack,
  } = useApp();
  const today = formatDateKey(new Date());
  const defaultDuration = Math.max(30, data.settings.defaultDurationMinutes);
  const timeFormat24h = data.settings.timeFormat24h;

  const [preset, setPreset] = useState<PresetId>("tonight");
  const [dateKey, setDateKey] = useState(today);
  const [startMinutes, setStartMinutes] = useState(19 * 60);
  const [endMinutes, setEndMinutes] = useState(19 * 60 + defaultDuration);

  const preview = useMemo(
    () => buildAdhocSlot(dateKey, startMinutes, endMinutes),
    [dateKey, startMinutes, endMinutes],
  );

  const applyPreset = (id: PresetId) => {
    hapticTick();
    setPreset(id);
    if (id === "tonight") {
      setDateKey(today);
      setStartMinutes(19 * 60);
      setEndMinutes(19 * 60 + defaultDuration);
      return;
    }
    if (id === "tomorrow") {
      setDateKey(formatDateKey(addDays(new Date(), 1)));
      setStartMinutes(19 * 60);
      setEndMinutes(19 * 60 + defaultDuration);
      return;
    }
    if (id === "weekend") {
      setDateKey(formatDateKey(nextSaturday(new Date())));
      setStartMinutes(14 * 60);
      setEndMinutes(14 * 60 + defaultDuration);
      return;
    }
    // custom — keep current date/time; chip marks “your pick”
  };

  const onDateChange = (next: string) => {
    setPreset("custom");
    setDateKey(next);
  };

  const onTimeChange = (which: "start" | "end", minutes: number) => {
    setPreset("custom");
    if (which === "start") {
      setStartMinutes(minutes);
    } else {
      setEndMinutes(minutes);
    }
  };

  const onToggleFriend = (friendId: string) => {
    hapticTick();
    toggleFriendSelection(friendId);
  };

  const onContinue = () => {
    if (endMinutes <= startMinutes) {
      Alert.alert("Check times", "End time must be after start time.");
      return;
    }
    openCreatePlan(preview, selectedFriendIds, { replace: true });
  };

  return (
    <Screen contentClassName="gap-6">
      <ScreenHeader title="When should we meet?" onBack={goBack} />
      <Text className="text-body text-muted">
        Pick a preset, then tap the time fields to fine-tune. Invite people now
        if you like — or on the next screen.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-1"
      >
        {PRESETS.map((item) => {
          const selected = preset === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${item.label}: ${item.hint}`}
              onPress={() => applyPreset(item.id)}
              className={cn(
                "min-h-[48px] min-w-[120px] items-center justify-center rounded-card px-4 py-3",
                selected ? "bg-primary" : "border border-border bg-surface",
              )}
            >
              <Text
                className={cn(
                  "font-sans-bold text-body",
                  selected ? "text-white" : "text-ink",
                )}
              >
                {item.label}
              </Text>
              <Text
                className={cn(
                  "mt-0.5 text-caption",
                  selected ? "text-white/80" : "text-muted",
                )}
              >
                {item.hint}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card className="gap-3">
        <DateSlotPicker label="Date" date={dateKey} onChange={onDateChange} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TimeSlotPicker
              label="Start"
              minutes={startMinutes}
              onChange={(minutes) => onTimeChange("start", minutes)}
              timeFormat24h={timeFormat24h}
            />
          </View>
          <View className="flex-1">
            <TimeSlotPicker
              label="End"
              minutes={endMinutes}
              onChange={(minutes) => onTimeChange("end", minutes)}
              timeFormat24h={timeFormat24h}
            />
          </View>
        </View>
      </Card>

      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-caption font-sans-semibold text-ink"
        >
          People
        </Text>
        <Text className="text-caption text-muted">
          Optional — skip if you’d rather invite on the next screen.
        </Text>

        {sortedFriends.length === 0 ? (
          <View className="gap-3">
            <Text className="text-body text-muted">
              Add a friend to invite them to this plan.
            </Text>
            <Button
              label="Add a friend"
              variant="secondary"
              onPress={() => openAddFriendForPlan(preview)}
            />
          </View>
        ) : (
          <>
            <View className="flex-row flex-wrap gap-2">
              {sortedFriends.map((friend) => {
                const selected = selectedFriendIds.includes(friend.id);
                return (
                  <Pressable
                    key={friend.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={friend.name}
                    onPress={() => onToggleFriend(friend.id)}
                    className={cn(
                      "min-h-[48px] flex-row items-center gap-2 rounded-full px-3 py-2",
                      selected
                        ? "bg-primary"
                        : "border border-border bg-surface",
                    )}
                  >
                    <Avatar
                      name={friend.name}
                      photoUri={friend.photoUri}
                      size={28}
                    />
                    <Text
                      className={cn(
                        "font-sans-semibold text-caption",
                        selected ? "text-white" : "text-ink",
                      )}
                    >
                      {firstName(friend.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add someone new"
              onPress={() => {
                hapticTick();
                openAddFriendForPlan(preview);
              }}
              className="min-h-[48px] items-center justify-center rounded-full border border-border bg-surface px-4"
            >
              <Text className="text-center font-sans-semibold text-caption leading-5 text-ink">
                Add someone new
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <Button label="Continue" onPress={onContinue} />
    </Screen>
  );
}
