import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { AnimatedDialog } from "../components/AnimatedDialog";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PressableScale } from "../components/PressableScale";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  catchUpLabel,
  catchUpStatus,
  formatClock,
  lastMetLabel,
  PLAN_STATUS_LABELS,
  RHYTHM_OPTIONS,
  SHARE_OPTIONS,
  suggestSlotsForScheduling,
} from "../domain/model";
import { formatDayHeading, startOfDay } from "../domain/time";
import type { ConcreteSlot } from "../domain/types";
import { hapticTick } from "../services/haptics";
import { useApp } from "../state/AppProvider";
import { cn } from "../ui/cn";

export function FriendProfileScreen() {
  const {
    activeFriend,
    data,
    openEditFriend,
    openPlanDetail,
    openCreatePlan,
    openAddAvailability,
    logCaughtUp,
    goBack,
  } = useApp();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pickDateOpen, setPickDateOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState(() => startOfDay(new Date()));

  const suggestions = useMemo(() => {
    if (!activeFriend) {
      return [] as ConcreteSlot[];
    }
    return suggestSlotsForScheduling(
      data.availability,
      data.skipped,
      data.plans,
      {
        count: 3,
        durationMinutes: data.settings.defaultDurationMinutes,
      },
    );
  }, [
    activeFriend,
    data.availability,
    data.skipped,
    data.plans,
    data.settings.defaultDurationMinutes,
  ]);

  if (!activeFriend) {
    return (
      <Screen>
        <ScreenHeader title="Friend" onBack={goBack} />
        <Text className="text-body text-muted">Friend not found.</Text>
      </Screen>
    );
  }

  const friend = activeFriend;
  const rhythm =
    RHYTHM_OPTIONS.find((option) => option.value === friend.rhythm)?.label ??
    "No schedule";
  const share =
    SHARE_OPTIONS.find((option) => option.value === friend.shareMethod)
      ?.label ?? "Other";
  const upcoming = data.plans
    .filter(
      (plan) =>
        plan.status !== "done" &&
        plan.status !== "cancelled" &&
        plan.friends.some(
          (item) => item.friendId === friend.id && item.status !== "moved",
        ) &&
        new Date(plan.startAt).getTime() >= Date.now(),
    )
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  const goodTimes = data.plans
    .filter(
      (plan) =>
        plan.status === "done" && plan.attendedFriendIds.includes(friend.id),
    )
    .sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    )
    .slice(0, 5);

  const onPickSuggestion = (slot: ConcreteSlot) => {
    hapticTick();
    openCreatePlan(slot, [friend.id]);
  };

  const onCaughtUpToday = () => {
    void logCaughtUp(friend.id, startOfDay(new Date()).toISOString());
  };

  const onConfirmPickedDate = () => {
    void logCaughtUp(friend.id, startOfDay(pickedDate).toISOString());
    setPickDateOpen(false);
  };

  const onDatePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android" && event.type === "set" && date) {
      void logCaughtUp(friend.id, startOfDay(date).toISOString());
      setPickDateOpen(false);
      return;
    }
    if (event.type === "dismissed") {
      setPickDateOpen(false);
      return;
    }
    if (date) {
      setPickedDate(startOfDay(date));
    }
  };

  const onWeCaughtUp = () => {
    Alert.alert("When did you catch up?", undefined, [
      { text: "Today", onPress: onCaughtUpToday },
      {
        text: "Pick date",
        onPress: () => {
          setPickedDate(startOfDay(new Date()));
          setPickDateOpen(true);
        },
      },
      { text: "Not sure", style: "cancel" },
    ]);
  };

  return (
    <Screen contentClassName="gap-5">
      <ScreenHeader title={friend.name} onBack={goBack} />

      <View className="items-center gap-2 py-1">
        <Avatar name={friend.name} photoUri={friend.photoUri} size={72} />
        <Text className="text-body text-muted">
          {lastMetLabel(friend.lastMetAt)}
        </Text>
        <View
          className={cn(
            "items-center justify-center rounded-full px-3 py-1.5",
            catchUpStatus(friend) === "due" && "bg-coral-soft",
            catchUpStatus(friend) === "soon" && "bg-primary-soft",
            catchUpStatus(friend) === "none" && "bg-canvas",
          )}
        >
          <Text
            className={cn(
              "text-center text-caption font-sans-semibold leading-5",
              catchUpStatus(friend) === "due" && "text-coral-deep",
              catchUpStatus(friend) === "soon" && "text-primary",
              catchUpStatus(friend) === "none" && "text-muted",
            )}
          >
            {catchUpLabel(catchUpStatus(friend), friend)}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-sans-bold text-section text-ink">
          Make a plan with {friend.name}
        </Text>
        {suggestions.length > 0 ? (
          suggestions.map((slot) => (
            <PressableScale
              key={slot.key}
              accessibilityRole="button"
              accessibilityLabel={`Plan with ${friend.name} on ${formatDayHeading(new Date(slot.startAt))}`}
              onPress={() => onPickSuggestion(slot)}
            >
              <View className="rounded-card bg-primary-soft p-4">
                <Text className="font-sans-semibold text-caption text-primary">
                  {formatDayHeading(new Date(slot.startAt))}
                </Text>
                <Text className="mt-1 font-sans-bold text-section text-ink">
                  {formatClock(slot.startMinutes, data.settings.timeFormat24h)}
                  {" – "}
                  {formatClock(slot.endMinutes, data.settings.timeFormat24h)}
                </Text>
                <Text className="mt-1 text-body text-primary">
                  Tap to plan with {friend.name}
                </Text>
              </View>
            </PressableScale>
          ))
        ) : (
          <Card className="gap-3 p-4">
            <Text className="text-body text-muted">
              No free windows yet. Add when you’re usually free, then come back
              to pick a time with {friend.name}.
            </Text>
            <Button
              label="Add free time"
              variant="secondary"
              onPress={openAddAvailability}
            />
          </Card>
        )}
      </View>

      {upcoming.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans-bold text-section text-ink">
            Coming up
          </Text>
          {upcoming.map((plan) => (
            <Button
              key={plan.id}
              label={`${plan.title} · ${PLAN_STATUS_LABELS[plan.status]}`}
              variant="secondary"
              onPress={() => openPlanDetail(plan.id)}
            />
          ))}
        </View>
      ) : null}

      {goodTimes.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans-bold text-section text-ink">
            Good times
          </Text>
          {goodTimes.map((plan) => (
            <PressableScale
              key={plan.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${plan.title}`}
              onPress={() => openPlanDetail(plan.id)}
            >
              <Card className="min-h-[44px] px-4 py-3">
                <Text className="font-sans-semibold text-body text-ink">
                  {plan.title}
                </Text>
                <Text className="text-caption text-muted">
                  {formatDayHeading(new Date(plan.startAt))}
                </Text>
                {plan.memoryNote ? (
                  <Text className="mt-1 text-body text-muted">
                    {plan.memoryNote}
                  </Text>
                ) : null}
              </Card>
            </PressableScale>
          ))}
        </View>
      ) : null}

      <Button label="We caught up" variant="secondary" onPress={onWeCaughtUp} />

      <View className="gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          accessibilityLabel="Details"
          onPress={() => setDetailsOpen((open) => !open)}
          className="min-h-[44px] flex-row items-center justify-between rounded-control border border-border bg-surface px-4 py-3"
        >
          <Text className="font-sans-semibold text-body text-ink">Details</Text>
          <Text className="text-caption text-muted">
            {detailsOpen ? "Hide" : "Show"}
          </Text>
        </Pressable>
        {detailsOpen ? (
          <Card className="gap-1 p-5">
            <Row label="Catch-up rhythm" value={rhythm} />
            {friend.phone ? <Row label="Phone" value={friend.phone} /> : null}
            <Row label="Share via" value={share} />
          </Card>
        ) : null}
      </View>

      <Button label="Edit" onPress={() => openEditFriend(friend.id)} />

      <AnimatedDialog
        visible={pickDateOpen}
        onClose={() => setPickDateOpen(false)}
        accessibilityLabel="Pick catch-up date"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">
            When did you catch up?
          </Text>
          {Platform.OS === "ios" ? (
            <>
              <DateTimePicker
                value={pickedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onDatePickerChange}
              />
              <Button label="Save" onPress={onConfirmPickedDate} />
            </>
          ) : (
            <DateTimePicker
              value={pickedDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={onDatePickerChange}
            />
          )}
        </View>
      </AnimatedDialog>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5 py-1">
      <Text className="text-caption text-muted">{label}</Text>
      <Text className="text-body text-ink">{value}</Text>
    </View>
  );
}
