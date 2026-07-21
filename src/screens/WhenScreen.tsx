import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { InviteSheet } from '../components/InviteSheet';
import { PressableScale } from '../components/PressableScale';
import { WhenCalendar } from '../components/WhenCalendar';
import {
  buildInsight,
  expandAvailability,
  formatClock,
  INVITE_STATUS_LABELS,
  lastMetLabel,
  PLAN_STATUS_LABELS,
} from '../domain/model';
import {
  addDays,
  formatDateKey,
  formatDayHeading,
  formatDayTitle,
  formatWeekTitle,
  startOfDay,
  startOfWeek,
  weekDates,
} from '../domain/time';
import type { ConcreteSlot } from '../domain/types';
import { color, shadowSoft } from '../foundation';
import { useApp } from '../state/AppProvider';
import { cn } from '../ui/cn';

type WhenMode = 'list' | 'week' | 'day';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Up late?';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function WhenScreen() {
  const {
    data,
    timeline,
    openAddAvailability,
    openCreatePlan,
    openPlanDetail,
    openAddFriend,
    openFriendProfile,
  } = useApp();

  const firstDay = data.settings.firstDayOfWeek;
  const [mode, setMode] = useState<WhenMode>('week');
  const [focusDate, setFocusDate] = useState(() => startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), firstDay));
  const [sheetSlot, setSheetSlot] = useState<ConcreteSlot | null>(null);

  useEffect(() => {
    setWeekStart(startOfWeek(focusDate, firstDay));
  }, [firstDay, focusDate]);

  const days = useMemo(() => weekDates(weekStart), [weekStart]);

  const calendarSlots = useMemo(
    () => expandAvailability(data.availability, data.skipped, weekStart, 7),
    [data.availability, data.skipped, weekStart],
  );

  const weekPlans = useMemo(
    () => data.plans.filter((plan) => {
      const key = formatDateKey(new Date(plan.startAt));
      return days.some((day) => formatDateKey(day) === key);
    }),
    [data.plans, days],
  );

  const title = mode === 'day' ? formatDayTitle(focusDate) : formatWeekTitle(weekStart);

  const onPrev = () => {
    if (mode === 'day') {
      setFocusDate((current) => addDays(current, -1));
    } else {
      const next = addDays(weekStart, -7);
      setWeekStart(next);
      setFocusDate(next);
    }
  };

  const onNext = () => {
    if (mode === 'day') {
      setFocusDate((current) => addDays(current, 1));
    } else {
      const next = addDays(weekStart, 7);
      setWeekStart(next);
      setFocusDate(next);
    }
  };

  const goToday = () => {
    const today = startOfDay(new Date());
    setFocusDate(today);
    setWeekStart(startOfWeek(today, firstDay));
  };

  const onMakePlan = (slot: ConcreteSlot, friendIds: string[]) => {
    setSheetSlot(null);
    openCreatePlan(slot, friendIds);
  };

  const insight = useMemo(
    () => buildInsight(data.friends, data.plans),
    [data.friends, data.plans],
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas font-sans" edges={['top', 'left', 'right']}>
      <View className="w-full flex-1 self-center px-4 pt-4" style={{ maxWidth: 480 }}>
        <View className="mb-4 flex-row items-end justify-between gap-3">
          <View className="flex-1">
            <Text className="font-sans-bold text-[28px] tracking-[-1px] text-primary">
              So, when?
            </Text>
            <Text className="text-caption text-muted">
              {greeting()} · {mode === 'list' ? 'the next few weeks' : title}
            </Text>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Add availability"
            onPress={openAddAvailability}
            className="h-12 w-12 items-center justify-center rounded-full bg-primary"
            style={shadowSoft}
          >
            <Icon name="plus" size={24} color="#FFFFFF" />
          </PressableScale>
        </View>

        <View className="mb-4 flex-row gap-1 rounded-full bg-surface p-1" style={shadowSoft}>
          {([
            ['list', 'List'],
            ['week', 'Week'],
            ['day', 'Day'],
          ] as const).map(([id, label]) => {
            const active = mode === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} view`}
                onPress={() => setMode(id)}
                className={cn(
                  'min-h-10 flex-1 items-center justify-center rounded-full',
                  active && 'bg-primary-soft',
                )}
              >
                <Text
                  className={cn(
                    'text-caption font-sans-semibold',
                    active ? 'text-primary' : 'text-muted',
                  )}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {insight && mode === 'list' ? (
          <View className="mb-3 flex-row items-start gap-2 rounded-control bg-surface/80 px-3 py-2.5">
            <Icon name="sun" size={14} color={color.primary} />
            <Text className="flex-1 text-caption text-muted italic">{insight}</Text>
          </View>
        ) : null}

        {mode !== 'list' ? (
          <View className="mb-3 flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              onPress={goToday}
              className="min-h-11 items-center justify-center rounded-full bg-surface px-4 active:bg-primary-soft"
              style={shadowSoft}
            >
              <Text className="text-caption font-sans-semibold text-ink">Today</Text>
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
            <Text className="flex-1 font-sans-bold text-body text-ink" numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : null}

        {data.friends.length === 0 && data.availability.length === 0 && mode === 'list' ? (
          <Card className="gap-3">
            <Text className="font-sans-bold text-section text-ink">
              Let’s get you to a real plan
            </Text>
            <Text className="text-body text-muted">
              Add a friend and when you’re usually free. Then tap a time and
              invite someone — that’s the whole trick.
            </Text>
            <Button label="Add a friend" onPress={openAddFriend} />
            <Button label="Add availability" variant="secondary" onPress={openAddAvailability} />
          </Card>
        ) : null}

        {mode === 'list' ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-3 pb-6"
            showsVerticalScrollIndicator={false}
          >
            {timeline.length === 0 && (data.friends.length > 0 || data.availability.length > 0) ? (
              <Card>
                <Text className="text-body text-muted">
                  Nothing open in the next three weeks yet. Tap + to mark some
                  free time — even an hour counts.
                </Text>
              </Card>
            ) : null}

            {timeline.map((item) => {
              if (item.type === 'due_friend') {
                return (
                  <PressableScale
                    key={`due-${item.friend.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.friend.name}, due for a catch-up`}
                    onPress={() => openFriendProfile(item.friend.id)}
                  >
                    <View className="flex-row items-center gap-3 rounded-card bg-coral-soft p-4">
                      <Avatar name={item.friend.name} photoUri={item.friend.photoUri} size={48} />
                      <View className="flex-1">
                        <Text className="font-sans-bold text-body text-ink">
                          Want to invite {item.friend.name}?
                        </Text>
                        <Text className="text-caption text-coral-deep">
                          {lastMetLabel(item.friend.lastMetAt)}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color={color.coralDeep} />
                    </View>
                  </PressableScale>
                );
              }

              if (item.type === 'availability') {
                const start = new Date(item.slot.startAt);
                return (
                  <PressableScale
                    key={item.slot.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Free ${formatDayHeading(start)}, tap to make a plan`}
                    onPress={() => setSheetSlot(item.slot)}
                  >
                    <View className="rounded-card bg-primary-soft p-4">
                      <Text className="font-sans-semibold text-caption text-primary">
                        {formatDayHeading(start)}
                      </Text>
                      <Text className="mt-1 font-sans-bold text-section text-ink">
                        {formatClock(item.slot.startMinutes, data.settings.timeFormat24h)}
                        {' – '}
                        {formatClock(item.slot.endMinutes, data.settings.timeFormat24h)}
                      </Text>
                      <Text className="mt-1 text-body text-primary">
                        You’re free — tap to plan something
                      </Text>
                    </View>
                  </PressableScale>
                );
              }

              const plan = item.plan;
              const start = new Date(plan.startAt);
              const startMin = start.getHours() * 60 + start.getMinutes();
              const yes = plan.friends.filter((f) => f.status === 'yes').length;
              const waiting = plan.friends.filter((f) => f.status === 'waiting' || f.status === 'maybe').length;
              const names = plan.friends
                .map((f) => data.friends.find((friend) => friend.id === f.friendId)?.name)
                .filter(Boolean)
                .join(', ');

              return (
                <PressableScale
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${plan.title}, ${PLAN_STATUS_LABELS[plan.status]}`}
                  onPress={() => openPlanDetail(plan.id)}
                >
                  <Card elevation="lift" className="p-4">
                    <Text className="font-sans-semibold text-caption text-muted">
                      {formatDayHeading(start)} · {formatClock(startMin, data.settings.timeFormat24h)}
                    </Text>
                    <Text className="mt-1 font-sans-bold text-section text-ink">{plan.title}</Text>
                    {names ? (
                      <Text className="mt-1 text-body text-muted">
                        {plan.activity ? `${plan.activity} with ${names}` : names}
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
              );
            })}
          </ScrollView>
        ) : (
          <View className="flex-1 gap-2">
            <Text className="text-caption text-muted">
              {data.availability.length === 0
                ? 'Tap + to mark free time, then tap a slot to plan.'
                : 'Tap a free slot to plan · tap a plan to open it'}
            </Text>
            <WhenCalendar
              mode={mode}
              days={days}
              focusDate={focusDate}
              slots={calendarSlots}
              plans={weekPlans}
              friends={data.friends}
              timeFormat24h={data.settings.timeFormat24h}
              dayStartHour={data.settings.calendarDayStartHour}
              dayEndHour={data.settings.calendarDayEndHour}
              onFocusDate={setFocusDate}
              onOpenSlot={setSheetSlot}
              onOpenPlan={openPlanDetail}
              onSwitchToDay={() => setMode('day')}
            />
          </View>
        )}
      </View>

      <InviteSheet
        slot={sheetSlot}
        onClose={() => setSheetSlot(null)}
        onMakePlan={onMakePlan}
      />
    </SafeAreaView>
  );
}
