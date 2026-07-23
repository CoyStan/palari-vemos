import { useEffect, useMemo, useState, Fragment } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedDialog } from "../components/AnimatedDialog";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { InviteSheet } from "../components/InviteSheet";
import { PressableScale } from "../components/PressableScale";
import { RecoveryWarningsBanner } from "../components/RecoveryWarningsBanner";
import { MonthsView } from "../components/MonthsView";
import { WhenCalendar } from "../components/WhenCalendar";
import {
  expandAvailability,
  formatClock,
  INVITE_STATUS_LABELS,
  lastMetLabel,
  PLAN_STATUS_LABELS,
  proposePlanWindow,
} from "../domain/model";
import {
  addDays,
  DAY_LABELS,
  formatDateKey,
  formatDayHeading,
  formatWeekTitle,
  MONTH_LABELS_LONG,
  MONTH_LABELS_SHORT,
  startOfDay,
  startOfWeek,
  weekDates,
} from "../domain/time";
import type { ConcreteSlot } from "../domain/types";
import { color, shadowSoft } from "../foundation";
import { hapticTick } from "../services/haptics";
import { useApp } from "../state/AppProvider";
import { cn } from "../ui/cn";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Up late?";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WhenScreen() {
  const {
    data,
    now,
    timeline,
    spotlightPlan: todaySpotlight,
    openAddAvailability,
    openCreatePlan,
    openMakePlan,
    openPlanDetail,
    openAddFriend,
    openFriendProfile,
    skipOccurrence,
    whenMode: mode,
    setWhenMode: setMode,
    whenFocusDate: focusDate,
    setWhenFocusDate: setFocusDate,
  } = useApp();

  const firstDay = data.settings.firstDayOfWeek;
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(focusDate, firstDay),
  );
  const [sheetSlot, setSheetSlot] = useState<ConcreteSlot | null>(null);
  const [skipSlot, setSkipSlot] = useState<ConcreteSlot | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    setWeekStart(startOfWeek(focusDate, firstDay));
  }, [firstDay, focusDate]);

  const days = useMemo(() => weekDates(weekStart), [weekStart]);

  const calendarSlots = useMemo(
    () => expandAvailability(data.availability, data.skipped, weekStart, 7),
    [data.availability, data.skipped, weekStart],
  );

  const weekPlans = useMemo(
    () =>
      data.plans.filter((plan) => {
        const key = formatDateKey(new Date(plan.startAt));
        return days.some((day) => formatDateKey(day) === key);
      }),
    [data.plans, days],
  );

  const title = formatWeekTitle(weekStart);

  const monthsSubtitle = `${MONTH_LABELS_SHORT[now.getMonth()]} ${now.getFullYear()}`;

  const onPrev = () => {
    const next = addDays(weekStart, -7);
    setWeekStart(next);
    setFocusDate(next);
  };

  const onNext = () => {
    const next = addDays(weekStart, 7);
    setWeekStart(next);
    setFocusDate(next);
  };

  const goToday = () => {
    const today = startOfDay(new Date());
    setFocusDate(today);
    setWeekStart(startOfWeek(today, firstDay));
  };

  const openProposedSlot = (slot: ConcreteSlot) => {
    const window = proposePlanWindow(
      slot.startAt,
      slot.endAt,
      data.settings.defaultDurationMinutes,
    );
    const start = new Date(window.startAt);
    const end = new Date(window.endAt);
    setSheetSlot({
      ...slot,
      startAt: window.startAt,
      endAt: window.endAt,
      startMinutes: start.getHours() * 60 + start.getMinutes(),
      endMinutes: end.getHours() * 60 + end.getMinutes(),
    });
  };

  const onMakePlan = (slot: ConcreteSlot, friendIds: string[]) => {
    setSheetSlot(null);
    openCreatePlan(slot, friendIds);
  };

  const onRequestSkip = (slot: ConcreteSlot) => {
    if (!slot.ruleId) {
      return;
    }
    hapticTick();
    setSkipSlot(slot);
  };

  const onConfirmSkip = async () => {
    if (!skipSlot?.ruleId) {
      return;
    }
    await skipOccurrence(skipSlot.ruleId, skipSlot.date);
    setSkipSlot(null);
  };

  const spotlightNames = todaySpotlight
    ? todaySpotlight.friends
        .filter((item) => item.status === "yes")
        .map(
          (item) =>
            data.friends.find((friend) => friend.id === item.friendId)?.name ??
            item.displayNameSnapshot,
        )
        .filter(Boolean)
        .join(", ")
    : "";

  const spotlightStart = todaySpotlight
    ? new Date(todaySpotlight.startAt)
    : null;
  const spotlightEnd = todaySpotlight ? new Date(todaySpotlight.endAt) : null;
  const spotlightStartMin = spotlightStart
    ? spotlightStart.getHours() * 60 + spotlightStart.getMinutes()
    : 0;
  const spotlightEndMin = spotlightEnd
    ? spotlightEnd.getHours() * 60 + spotlightEnd.getMinutes()
    : 0;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas font-sans"
      edges={["top", "left", "right"]}
    >
      <View
        className="w-full flex-1 self-center px-4 pt-4"
        style={{ maxWidth: 480 }}
      >
        <View className="mb-4 flex-row items-end justify-between gap-3">
          <View className="flex-1">
            <Text className="font-sans-bold text-[34px] tracking-[-1.2px]">
              <Text className="text-primary">So, </Text>
              <Text className="text-ink">when?</Text>
            </Text>
            <Text className="text-caption text-muted">
              {greeting()} ·{" "}
              {mode === "list"
                ? "the next few weeks"
                : mode === "months"
                  ? monthsSubtitle
                  : title}
            </Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Add"
            onPress={() => setAddMenuOpen(true)}
            className="min-h-12 w-12 items-center justify-center rounded-full bg-primary"
            style={shadowSoft}
          >
            <Icon name="plus" size={22} color="#FFFFFF" />
          </PressableScale>
        </View>

        <RecoveryWarningsBanner />

        {todaySpotlight && spotlightStart ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Today: ${todaySpotlight.title}`}
            onPress={() => openPlanDetail(todaySpotlight.id)}
            className="mb-3"
          >
            <View className="rounded-card bg-coral-soft p-4" style={shadowSoft}>
              <Text className="font-sans-semibold text-caption text-coral-deep">
                Today ·{" "}
                {formatClock(spotlightStartMin, data.settings.timeFormat24h)}
                {" – "}
                {formatClock(spotlightEndMin, data.settings.timeFormat24h)}
              </Text>
              <Text className="mt-1 font-sans-bold text-section text-ink">
                {todaySpotlight.status === "on"
                  ? `It’s on${spotlightNames ? ` with ${spotlightNames}` : ""}`
                  : todaySpotlight.title}
              </Text>
              <Text className="mt-1 text-caption text-muted">
                {PLAN_STATUS_LABELS[todaySpotlight.status]} · tap to open
              </Text>
            </View>
          </PressableScale>
        ) : null}

        <View
          className="mb-4 flex-row gap-1 rounded-full bg-surface p-1"
          style={shadowSoft}
        >
          {(
            [
              ["list", "List"],
              ["week", "Week"],
              ["months", "Months"],
            ] as const
          ).map(([id, label]) => {
            const active = mode === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} view`}
                onPress={() => setMode(id)}
                className={cn(
                  "min-h-11 flex-1 items-center justify-center rounded-full px-2",
                  active && "bg-primary-soft",
                )}
              >
                <Text
                  className={cn(
                    "text-center text-caption font-sans-semibold leading-5",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === "week" ? (
          <View className="mb-3 flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              onPress={goToday}
              className="min-h-11 items-center justify-center rounded-full bg-surface px-4 active:bg-primary-soft"
              style={shadowSoft}
            >
              <Text className="text-center text-caption font-sans-semibold leading-5 text-ink">
                Today
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous"
              onPress={onPrev}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface active:bg-primary-soft"
              style={shadowSoft}
            >
              <Icon name="chevron-left" size={22} color={color.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next"
              onPress={onNext}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface active:bg-primary-soft"
              style={shadowSoft}
            >
              <Icon name="chevron-right" size={22} color={color.ink} />
            </Pressable>
            <Text
              className="flex-1 font-sans-bold text-body text-ink"
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        ) : null}

        {data.friends.length === 0 && mode === "list" ? (
          <Card className="gap-3">
            <Text className="font-sans-bold text-section text-ink">
              Start with someone you miss
            </Text>
            <Text className="text-body text-muted">
              Add a friend first — then mark when you’re free and invite them.
            </Text>
            <Button label="Add a friend" onPress={openAddFriend} />
          </Card>
        ) : null}

        {data.friends.length > 0 &&
        data.availability.length === 0 &&
        mode === "list" ? (
          <Card className="gap-3">
            <Text className="font-sans-bold text-section text-ink">
              Ready when you are
            </Text>
            <Text className="text-body text-muted">
              You don’t need a schedule — pick a time and invite someone.
            </Text>
            <Button label="Make a plan" onPress={() => openMakePlan()} />
            <Button
              label="Add free time"
              variant="secondary"
              onPress={openAddAvailability}
            />
          </Card>
        ) : null}

        {mode === "list" ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-3 pb-6"
            showsVerticalScrollIndicator={false}
          >
            {timeline.length === 0 &&
            data.friends.length > 0 &&
            data.availability.length > 0 ? (
              <Card className="gap-3">
                <Text className="text-body text-muted">
                  Nothing open in the next three weeks yet. Add free time — even
                  an hour counts.
                </Text>
                <Button
                  label="Add free time"
                  variant="secondary"
                  onPress={openAddAvailability}
                />
              </Card>
            ) : null}

            {(() => {
              let lastMonthKey: string | null = null;
              return timeline.map((item) => {
                const itemDate = new Date(item.sortAt);
                const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
                const showMonthHeader = monthKey !== lastMonthKey;
                const isFirstMonthSection =
                  showMonthHeader && lastMonthKey === null;
                lastMonthKey = monthKey;
                const monthTitle =
                  MONTH_LABELS_LONG[itemDate.getMonth()] ??
                  MONTH_LABELS_SHORT[itemDate.getMonth()] ??
                  "";

                const monthHeader = showMonthHeader ? (
                  <Text
                    className={cn(
                      "mb-1 font-sans-bold text-[28px] leading-8 tracking-[-1px] text-ink",
                      !isFirstMonthSection && "mt-3",
                    )}
                  >
                    {monthTitle}
                  </Text>
                ) : null;

                if (item.type === "catch_up") {
                  return (
                    <Fragment key={`catch-${item.friend.id}`}>
                      {monthHeader}
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel={`${item.friend.name}, catch-up suggestion`}
                        onPress={() => openFriendProfile(item.friend.id)}
                      >
                        <View className="flex-row items-center gap-3 rounded-card bg-coral-soft p-4">
                          <Avatar
                            name={item.friend.name}
                            photoUri={item.friend.photoUri}
                            size={48}
                          />
                          <View className="flex-1">
                            <Text className="font-sans-bold text-body text-ink">
                              Want to invite {item.friend.name}?
                            </Text>
                            <Text className="text-caption text-coral-deep">
                              {lastMetLabel(item.friend.lastMetAt)}
                            </Text>
                          </View>
                          <Icon
                            name="chevron-right"
                            size={20}
                            color={color.coralDeep}
                          />
                        </View>
                      </PressableScale>
                    </Fragment>
                  );
                }

                if (item.type === "did_it_happen") {
                  const plan = item.plan;
                  const start = new Date(plan.startAt);
                  const weekday = DAY_LABELS[start.getDay()] ?? "";
                  return (
                    <Fragment key={`ask-${plan.id}`}>
                      {monthHeader}
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel={`Did ${plan.title} happen?`}
                        onPress={() => openPlanDetail(plan.id)}
                      >
                        <Card
                          className="flex-row items-stretch overflow-hidden"
                          style={{ padding: 0 }}
                        >
                          <View
                            className="items-center justify-center px-2 py-4"
                            style={{
                              width: "25%",
                              borderRightWidth: 1,
                              borderRightColor: color.border,
                            }}
                          >
                            <Text className="text-center text-caption font-sans-semibold uppercase tracking-[0.4px] text-muted">
                              {weekday}
                            </Text>
                            <Text className="mt-1 text-center font-sans-bold text-[28px] leading-8 tracking-[-1px] text-ink">
                              {start.getDate()}
                            </Text>
                          </View>
                          <View className="flex-1 justify-center gap-1 px-4 py-4">
                            <Text className="font-sans-semibold text-caption text-muted">
                              Did this happen?
                            </Text>
                            <Text className="font-sans-bold text-section text-ink">
                              {plan.title}
                            </Text>
                          </View>
                        </Card>
                      </PressableScale>
                    </Fragment>
                  );
                }

                if (item.type === "availability") {
                  const start = new Date(item.slot.startAt);
                  const weekday = DAY_LABELS[start.getDay()] ?? "";
                  return (
                    <Fragment key={item.slot.key}>
                      {monthHeader}
                      <View className="relative rounded-card bg-primary-soft">
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel={`Free ${formatDayHeading(start)}, tap to make a plan`}
                          onPress={() => openProposedSlot(item.slot)}
                          className="flex-row items-stretch"
                        >
                          <View
                            className="items-center justify-center px-2 py-4"
                            style={{
                              width: "25%",
                              borderRightWidth: 1,
                              borderRightColor: color.softTealBorder,
                            }}
                          >
                            <Text className="text-center text-caption font-sans-semibold uppercase tracking-[0.4px] text-primary">
                              {weekday}
                            </Text>
                            <Text className="mt-1 text-center font-sans-bold text-[28px] leading-8 tracking-[-1px] text-ink">
                              {start.getDate()}
                            </Text>
                          </View>
                          <View className="flex-1 justify-center gap-1 px-4 py-4 pr-12">
                            <Text className="font-sans-bold text-section leading-6 text-ink">
                              {formatClock(
                                item.slot.startMinutes,
                                data.settings.timeFormat24h,
                              )}
                              {" – "}
                              {formatClock(
                                item.slot.endMinutes,
                                data.settings.timeFormat24h,
                              )}
                            </Text>
                            <Text className="mt-1 text-body leading-5 text-primary">
                              You’re free
                            </Text>
                            <Text className="text-body leading-5 text-primary">
                              Tap to plan something
                            </Text>
                          </View>
                        </PressableScale>
                        {item.slot.ruleId ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Skip free time on ${formatDayHeading(start)}`}
                            hitSlop={4}
                            onPress={() => onRequestSkip(item.slot)}
                            className="absolute right-0.5 top-0.5 z-20 h-11 w-11 items-center justify-center"
                          >
                            <Icon name="x" size={16} color={color.primary} />
                          </Pressable>
                        ) : null}
                      </View>
                    </Fragment>
                  );
                }

                const plan = item.plan;
                const start = new Date(plan.startAt);
                const end = new Date(plan.endAt);
                const startMin = start.getHours() * 60 + start.getMinutes();
                const endMin = end.getHours() * 60 + end.getMinutes();
                const activeFriends = plan.friends.filter(
                  (f) => f.status !== "moved",
                );
                const yes = activeFriends.filter(
                  (f) => f.status === "yes",
                ).length;
                const waiting = activeFriends.filter(
                  (f) => f.status === "waiting" || f.status === "maybe",
                ).length;
                const names = activeFriends
                  .map(
                    (f) =>
                      data.friends.find((friend) => friend.id === f.friendId)
                        ?.name ?? f.displayNameSnapshot,
                  )
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Fragment key={plan.id}>
                    {monthHeader}
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={`${plan.title}, ${PLAN_STATUS_LABELS[plan.status]}`}
                      onPress={() => openPlanDetail(plan.id)}
                    >
                      <Card elevation="lift" className="p-4">
                        <Text className="font-sans-semibold text-caption text-muted">
                          {DAY_LABELS[start.getDay()]} {start.getDate()} ·{" "}
                          {formatClock(startMin, data.settings.timeFormat24h)}
                          {" – "}
                          {formatClock(endMin, data.settings.timeFormat24h)}
                        </Text>
                        <Text className="mt-1 font-sans-bold text-section text-ink">
                          {plan.title}
                        </Text>
                        {names ? (
                          <Text className="mt-1 text-body text-muted">
                            {plan.activity
                              ? `${plan.activity} with ${names}`
                              : names}
                          </Text>
                        ) : null}
                        <Text className="mt-2 text-caption font-sans-semibold text-primary">
                          {PLAN_STATUS_LABELS[plan.status]}
                          {yes || waiting
                            ? ` · ${yes} confirmed · ${waiting} waiting`
                            : ` · ${INVITE_STATUS_LABELS.not_invited}`}
                        </Text>
                      </Card>
                    </PressableScale>
                  </Fragment>
                );
              });
            })()}
          </ScrollView>
        ) : mode === "months" ? (
          <View className="min-h-0 flex-1">
            <MonthsView
              plans={data.plans}
              catchUps={data.catchUps}
              friends={data.friends}
              firstDayOfWeek={firstDay}
              now={now}
              onOpenPlan={openPlanDetail}
            />
          </View>
        ) : (
          <View className="flex-1 gap-2">
            <Text className="text-caption text-muted">
              {data.availability.length === 0
                ? "Tap + to make a plan or mark free time."
                : "Tap a free slot to plan · use Skip on a slot · tap a plan to open"}
            </Text>
            <WhenCalendar
              days={days}
              focusDate={focusDate}
              slots={calendarSlots}
              plans={weekPlans}
              friends={data.friends}
              timeFormat24h={data.settings.timeFormat24h}
              dayStartHour={data.settings.calendarDayStartHour}
              dayEndHour={data.settings.calendarDayEndHour}
              onFocusDate={setFocusDate}
              onOpenSlot={openProposedSlot}
              onSkipSlot={onRequestSkip}
              onOpenPlan={openPlanDetail}
              now={now}
            />
          </View>
        )}
      </View>

      <InviteSheet
        slot={sheetSlot}
        onClose={() => setSheetSlot(null)}
        onMakePlan={onMakePlan}
      />

      <AnimatedDialog
        visible={addMenuOpen}
        onClose={() => setAddMenuOpen(false)}
        accessibilityLabel="Add a plan or free time"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">
            What would you like to add?
          </Text>
          <Button
            label="Make a plan"
            onPress={() => {
              setAddMenuOpen(false);
              openMakePlan();
            }}
          />
          <Button
            label="Add free time"
            variant="secondary"
            onPress={() => {
              setAddMenuOpen(false);
              openAddAvailability();
            }}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setAddMenuOpen(false)}
          />
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={skipSlot !== null}
        onClose={() => setSkipSlot(null)}
        accessibilityLabel="Skip this free time"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">
            Skip this free time?
          </Text>
          <Text className="text-body text-muted">
            {skipSlot
              ? `Hide ${formatDayHeading(new Date(skipSlot.startAt))} ${formatClock(skipSlot.startMinutes, data.settings.timeFormat24h)} just this once. Your recurring rule stays.`
              : ""}
          </Text>
          <Button label="Skip this one" onPress={() => void onConfirmSkip()} />
          <Button
            label="Keep it"
            variant="ghost"
            onPress={() => setSkipSlot(null)}
          />
        </View>
      </AnimatedDialog>
    </SafeAreaView>
  );
}
