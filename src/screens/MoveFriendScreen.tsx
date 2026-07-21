import { Alert, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PressableScale } from "../components/PressableScale";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  formatClock,
  proposePlanWindow,
  slotConflictsWithPlans,
} from "../domain/model";
import { formatDayHeading } from "../domain/time";
import type { ConcreteSlot } from "../domain/types";
import { useApp } from "../state/AppProvider";

export function MoveFriendScreen() {
  const {
    moveFriendId,
    activePlanId,
    data,
    slots,
    moveFriendToSlot,
    openAddAvailability,
    goBack,
  } = useApp();

  const friend = data.friends.find((item) => item.id === moveFriendId);
  const sourcePlan =
    data.plans.find((plan) => plan.id === activePlanId) ?? null;
  const sourceWillCancel = Boolean(
    sourcePlan &&
    moveFriendId &&
    sourcePlan.friends.filter(
      (item) => item.status !== "moved" && item.friendId !== moveFriendId,
    ).length === 0,
  );
  const excludePlanId = sourceWillCancel && sourcePlan ? sourcePlan.id : null;

  const destinationFor = (slot: ConcreteSlot) => {
    const window = proposePlanWindow(
      slot.startAt,
      slot.endAt,
      data.settings.defaultDurationMinutes,
    );
    const start = new Date(window.startAt);
    const end = new Date(window.endAt);
    return {
      window,
      startMinutes: start.getHours() * 60 + start.getMinutes(),
      endMinutes: end.getHours() * 60 + end.getMinutes(),
      booked: slotConflictsWithPlans(window.startAt, window.endAt, data.plans, {
        availabilityKey: slot.key,
        excludePlanId,
      }),
      sameAsSource: Boolean(
        sourcePlan &&
        sourcePlan.startAt === window.startAt &&
        sourcePlan.endAt === window.endAt,
      ),
    };
  };

  const onPick = async (slot: ConcreteSlot) => {
    const dest = destinationFor(slot);
    if (dest.booked || dest.sameAsSource) {
      return;
    }
    const result = await moveFriendToSlot(slot);
    if (!result.ok) {
      Alert.alert(
        "Could not move",
        result.message ?? "Pick another free time.",
      );
    }
  };

  return (
    <Screen contentClassName="gap-4">
      <ScreenHeader
        title={friend ? `Move ${friend.name}` : "Move friend"}
        onBack={goBack}
      />
      <Text className="text-body text-muted">
        Pick another free time — or add a new one first. Times show the plan
        length, not the whole free window.
      </Text>

      <Button
        label="Add a new free time"
        variant="secondary"
        onPress={openAddAvailability}
      />

      <View className="gap-2">
        {slots.length === 0 ? (
          <Card>
            <Text className="text-body text-muted">
              No free times in the next three weeks.
            </Text>
          </Card>
        ) : (
          slots.map((slot) => {
            const start = new Date(slot.startAt);
            const dest = destinationFor(slot);
            const disabled = dest.booked || dest.sameAsSource;
            const label = `${formatDayHeading(start)}, ${formatClock(dest.startMinutes, data.settings.timeFormat24h)} to ${formatClock(dest.endMinutes, data.settings.timeFormat24h)}${disabled ? ", unavailable" : ""}`;
            return (
              <PressableScale
                key={slot.key}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                accessibilityLabel={label}
                disabled={disabled}
                onPress={() => void onPick(slot)}
                className={disabled ? "opacity-45" : "opacity-100"}
              >
                <Card className="min-h-[44px] px-4 py-3">
                  <Text className="font-sans-semibold text-body text-ink">
                    {formatDayHeading(start)}
                  </Text>
                  <Text className="text-caption text-primary">
                    {formatClock(
                      dest.startMinutes,
                      data.settings.timeFormat24h,
                    )}
                    {" – "}
                    {formatClock(dest.endMinutes, data.settings.timeFormat24h)}
                  </Text>
                  {dest.booked ? (
                    <Text className="mt-1 text-caption text-muted">
                      Already booked
                    </Text>
                  ) : null}
                  {dest.sameAsSource ? (
                    <Text className="mt-1 text-caption text-muted">
                      Current plan time
                    </Text>
                  ) : null}
                </Card>
              </PressableScale>
            );
          })
        )}
      </View>
    </Screen>
  );
}
