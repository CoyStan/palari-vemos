import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { slotIsBooked } from '../domain/freeBlocks';
import { STATUS_LABELS } from '../domain/invitation';
import {
  DAY_END_HOUR,
  DAY_LABELS,
  DAY_START_HOUR,
  formatDateKey,
  HOUR_HEIGHT,
  minutesToLabel,
  weekDates,
} from '../domain/time';
import type { ConcreteSlot, Invitation } from '../domain/types';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

const TIME_GUTTER = 52;

export function CalendarScreen() {
  const {
    data,
    weekStart,
    weekSlots,
    weekInvitations,
    shiftWeek,
    openFreeTimes,
    openPickFriend,
    openInviteDetail,
    openAddFriend,
  } = useApp();

  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 430);
  const dayWidth = (contentWidth - TIME_GUTTER - space.xl * 2) / 7;
  const hours = DAY_END_HOUR - DAY_START_HOUR;
  const gridHeight = hours * HOUR_HEIGHT;
  const days = weekDates(weekStart);
  const todayKey = formatDateKey(new Date());

  const weekLabel = useMemo(() => {
    const end = days[6]!;
    const start = days[0]!;
    return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
  }, [days]);

  if (data.friends.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.emptyPad}>
          <Text style={styles.wordmark}>Vemos</Text>
          <Text style={styles.title}>Your week</Text>
          <Text style={styles.body}>Add a friend first, then mark when you’re free.</Text>
          <Button label="Add a friend" onPress={() => openAddFriend('friends')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>Vemos</Text>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={() => shiftWeek(-1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            onPress={() => shiftWeek(1)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Button
          label="Free times"
          variant="secondary"
          onPress={openFreeTimes}
          style={styles.toolbarBtn}
        />
        {data.freeBlocks.length === 0 ? (
          <Text style={styles.hint}>Add free times, then tap a block to invite.</Text>
        ) : (
          <Text style={styles.hint}>Tap a free block to invite someone.</Text>
        )}
      </View>

      <View style={styles.dayHeaderRow}>
        <View style={{ width: TIME_GUTTER }} />
        {days.map((day) => {
          const key = formatDateKey(day);
          const isToday = key === todayKey;
          return (
            <View key={key} style={[styles.dayHeader, { width: dayWidth }]}>
              <Text style={[styles.dayName, isToday ? styles.todayText : null]}>
                {DAY_LABELS[day.getDay()]}
              </Text>
              <Text style={[styles.dayNum, isToday ? styles.todayText : null]}>
                {day.getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.grid, { height: gridHeight }]}>
          <View style={styles.timeColumn}>
            {Array.from({ length: hours }, (_, i) => {
              const hour = DAY_START_HOUR + i;
              return (
                <View key={hour} style={[styles.timeRow, { height: HOUR_HEIGHT }]}>
                  <Text style={styles.timeLabel}>{minutesToLabel(hour * 60)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.daysRow}>
            {days.map((day, dayIndex) => {
              const dateKey = formatDateKey(day);
              const daySlots = weekSlots.filter((slot) => slot.date === dateKey);
              const dayInvites = weekInvitations.filter((invite) => {
                const inviteDate = formatDateKey(new Date(invite.startAt));
                return inviteDate === dateKey;
              });

              return (
                <View
                  key={dateKey}
                  style={[styles.dayColumn, { width: dayWidth, height: gridHeight }]}
                >
                  {Array.from({ length: hours }, (_, i) => (
                    <View
                      key={`${dateKey}-${i}`}
                      style={[styles.hourLine, { top: i * HOUR_HEIGHT }]}
                    />
                  ))}

                  {daySlots.map((slot) => (
                    <FreeBlockView
                      key={slot.key}
                      slot={slot}
                      dayWidth={dayWidth}
                      booked={slotIsBooked(slot, data.invitations)}
                      onPress={() => {
                        if (!slotIsBooked(slot, data.invitations)) {
                          openPickFriend(slot);
                        }
                      }}
                    />
                  ))}

                  {dayInvites.map((invite) => (
                    <InviteBlockView
                      key={invite.id}
                      invite={invite}
                      dayWidth={dayWidth}
                      friendName={
                        data.friends.find((friend) => friend.id === invite.friendId)?.name
                          ?? 'Friend'
                      }
                      onPress={() => openInviteDetail(invite.id)}
                    />
                  ))}

                  {dayIndex < 6 ? <View style={styles.dayDivider} /> : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FreeBlockView({
  slot,
  dayWidth,
  booked,
  onPress,
}: {
  slot: ConcreteSlot;
  dayWidth: number;
  booked: boolean;
  onPress: () => void;
}) {
  const top = ((slot.startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((slot.endMinutes - slot.startMinutes) / 60) * HOUR_HEIGHT;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Free ${minutesToLabel(slot.startMinutes)} to ${minutesToLabel(slot.endMinutes)}`}
      disabled={booked}
      onPress={onPress}
      style={[
        styles.freeBlock,
        {
          top,
          height: Math.max(height - 2, 28),
          width: dayWidth - 4,
          opacity: booked ? 0.35 : 1,
        },
      ]}
    >
      <Text style={styles.freeBlockText} numberOfLines={2}>
        {booked ? 'Booked' : 'Free'}
      </Text>
    </Pressable>
  );
}

function InviteBlockView({
  invite,
  dayWidth,
  friendName,
  onPress,
}: {
  invite: Invitation;
  dayWidth: number;
  friendName: string;
  onPress: () => void;
}) {
  const start = new Date(invite.startAt);
  const end = new Date(invite.endAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const top = ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  const statusColor = invite.status === 'accepted'
    ? color.success
    : invite.status === 'sent'
      ? color.primary
      : color.coral;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friendName}, ${STATUS_LABELS[invite.status]}`}
      onPress={onPress}
      style={[
        styles.inviteBlock,
        {
          top,
          height: Math.max(height - 2, 32),
          width: dayWidth - 4,
          borderLeftColor: statusColor,
        },
      ]}
    >
      <Text style={styles.inviteName} numberOfLines={1}>{friendName}</Text>
      <Text style={styles.inviteStatus} numberOfLines={1}>
        {STATUS_LABELS[invite.status]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  emptyPad: {
    flex: 1,
    padding: space.xl,
    justifyContent: 'center',
    gap: space.lg,
  },
  header: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    color: color.primary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
  },
  weekLabel: {
    color: color.muted,
    fontSize: type.caption,
    marginTop: 2,
  },
  title: {
    color: color.ink,
    fontSize: type.title,
    fontWeight: '700',
  },
  body: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
  },
  headerActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: color.primary,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '600',
  },
  toolbar: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  toolbarBtn: {
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  hint: {
    color: color.muted,
    fontSize: type.caption,
    lineHeight: 18,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    marginBottom: space.xs,
  },
  dayHeader: {
    alignItems: 'center',
    gap: 2,
  },
  dayName: {
    color: color.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  dayNum: {
    color: color.ink,
    fontSize: type.caption,
    fontWeight: '700',
  },
  todayText: {
    color: color.primary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: space.xl,
  },
  grid: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: TIME_GUTTER,
  },
  timeRow: {
    justifyContent: 'flex-start',
  },
  timeLabel: {
    color: color.muted,
    fontSize: 10,
    marginTop: -6,
  },
  daysRow: {
    flexDirection: 'row',
    flex: 1,
  },
  dayColumn: {
    position: 'relative',
    backgroundColor: color.surface,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
  },
  dayDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
  },
  freeBlock: {
    position: 'absolute',
    left: 2,
    borderRadius: 8,
    backgroundColor: color.softTeal,
    borderWidth: 1,
    borderColor: '#B7E0DD',
    padding: 4,
    zIndex: 1,
  },
  freeBlockText: {
    color: color.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  inviteBlock: {
    position: 'absolute',
    left: 2,
    borderRadius: 8,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderLeftWidth: 3,
    padding: 4,
    zIndex: 2,
  },
  inviteName: {
    color: color.ink,
    fontSize: 10,
    fontWeight: '700',
  },
  inviteStatus: {
    color: color.muted,
    fontSize: 9,
  },
});
