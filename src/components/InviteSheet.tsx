import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AnimatedDialog } from "./AnimatedDialog";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { formatClock, lastMetLabel } from "../domain/model";
import { formatDayHeading } from "../domain/time";
import type { ConcreteSlot } from "../domain/types";
import { color } from "../foundation";
import { useApp } from "../state/AppProvider";
import { cn } from "../ui/cn";

type Props = {
  slot: ConcreteSlot | null;
  onClose: () => void;
  onMakePlan: (slot: ConcreteSlot, friendIds: string[]) => void;
};

/**
 * Tap a free slot → this sheet floats up (design-system/pages/calendar.md:
 * "animated invite sheet, not a hard route jump"). Pick people here,
 * then continue into the full plan flow.
 */
export function InviteSheet({ slot, onClose, onMakePlan }: Props) {
  const { sortedFriends, data, openAddFriendForPlan } = useApp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (slot) {
      setSelectedIds([]);
    }
  }, [slot]);

  const toggle = (friendId: string) => {
    setSelectedIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const start = slot ? new Date(slot.startAt) : null;
  const end = slot ? new Date(slot.endAt) : null;
  const startMin = start ? start.getHours() * 60 + start.getMinutes() : 0;
  const endMin = end ? end.getHours() * 60 + end.getMinutes() : 0;

  return (
    <AnimatedDialog
      visible={slot !== null}
      onClose={onClose}
      accessibilityLabel="Make a plan"
    >
      {slot && start ? (
        <View className="gap-4 px-5 pb-4">
          <View className="gap-1">
            <Text className="font-sans-semibold text-caption text-muted">
              {formatDayHeading(start)}
            </Text>
            <Text className="font-sans-bold text-section text-ink">
              {formatClock(startMin, data.settings.timeFormat24h)}
              {" – "}
              {formatClock(endMin, data.settings.timeFormat24h)}
            </Text>
            <Text className="text-body text-muted">
              You’re free. Who should come?
            </Text>
          </View>

          {sortedFriends.length === 0 ? (
            <View className="gap-3">
              <Text className="text-body text-muted">
                Add a friend first, then invite them here.
              </Text>
              <Button
                label="Add a friend"
                variant="secondary"
                onPress={() => {
                  onClose();
                  openAddFriendForPlan(slot, selectedIds, "inviteSheet");
                }}
              />
            </View>
          ) : (
            <ScrollView
              className="max-h-[280px]"
              showsVerticalScrollIndicator={false}
            >
              <View className="gap-1">
                {sortedFriends.map((friend) => {
                  const selected = selectedIds.includes(friend.id);
                  return (
                    <Pressable
                      key={friend.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={friend.name}
                      onPress={() => toggle(friend.id)}
                      className={cn(
                        "min-h-[56px] flex-row items-center gap-3 rounded-control px-3 py-2",
                        selected ? "bg-primary-soft" : "active:bg-canvas",
                      )}
                    >
                      <Avatar
                        name={friend.name}
                        photoUri={friend.photoUri}
                        size={40}
                      />
                      <View className="flex-1">
                        <Text className="font-sans-semibold text-body text-ink">
                          {friend.name}
                        </Text>
                        <Text className="text-caption text-muted">
                          {lastMetLabel(friend.lastMetAt)}
                        </Text>
                      </View>
                      <View
                        className={cn(
                          "h-6 w-6 items-center justify-center rounded-full border",
                          selected
                            ? "border-primary bg-primary"
                            : "border-border bg-surface",
                        )}
                      >
                        {selected ? (
                          <Icon
                            name="check"
                            size={14}
                            color={color.primaryText}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {sortedFriends.length > 0 ? (
            <View className="gap-2">
              <Button
                label="Add someone new"
                variant="ghost"
                onPress={() => {
                  onClose();
                  openAddFriendForPlan(slot, selectedIds, "inviteSheet");
                }}
              />
              <Button
                label={
                  selectedIds.length > 0
                    ? `Make a plan with ${selectedIds.length === 1 ? "1 person" : `${selectedIds.length} people`}`
                    : "Make a plan"
                }
                onPress={() => onMakePlan(slot, selectedIds)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </AnimatedDialog>
  );
}
