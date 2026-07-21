import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { slotIsBooked } from '../domain/freeBlocks';
import { formatSlotRange, minutesToLabel } from '../domain/time';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

/** Pick a different free slot to move the active invitation onto. */
export function MoveInviteScreen() {
  const {
    weekSlots,
    data,
    selectSlotForMove,
    goCalendar,
    openInviteDetail,
    activeInvitationId,
    shiftWeek,
    weekStart,
  } = useApp();

  const openSlots = weekSlots.filter((slot) => !slotIsBooked(slot, data.invitations));

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => {
          if (activeInvitationId) {
            openInviteDetail(activeInvitationId);
          } else {
            goCalendar();
          }
        }}
        style={styles.back}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Move to another time</Text>
      <Text style={styles.subtitle}>
        Pick a free slot this week. Use the arrows on Calendar to change weeks first if needed.
      </Text>

      <View style={styles.weekNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => shiftWeek(-1)}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>‹ Prev week</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => shiftWeek(1)}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>Next week ›</Text>
        </Pressable>
      </View>

      <Text style={styles.weekLabel}>
        Week of {weekStart.getMonth() + 1}/{weekStart.getDate()}
      </Text>

      {openSlots.length === 0 ? (
        <Text style={styles.empty}>
          No open free times this week. Add free times or try another week.
        </Text>
      ) : (
        <View style={styles.list}>
          {openSlots.map((slot) => (
            <Pressable
              key={slot.key}
              accessibilityRole="button"
              accessibilityLabel={formatSlotRange(slot.startAt, slot.endAt)}
              onPress={() => void selectSlotForMove(slot)}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>
                {formatSlotRange(slot.startAt, slot.endAt)}
              </Text>
              <Text style={styles.rowMeta}>
                {minutesToLabel(slot.startMinutes)} – {minutesToLabel(slot.endMinutes)}
                {slot.label ? ` · ${slot.label}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  backText: {
    color: color.primary,
    fontSize: type.body,
    fontWeight: '600',
  },
  title: {
    color: color.ink,
    fontSize: type.title,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: space.sm,
  },
  subtitle: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
    marginBottom: space.lg,
  },
  weekNav: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.md,
  },
  navBtn: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    justifyContent: 'center',
  },
  navText: {
    color: color.primary,
    fontWeight: '600',
  },
  weekLabel: {
    color: color.ink,
    fontWeight: '600',
    marginBottom: space.lg,
  },
  empty: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
  },
  list: {
    gap: space.sm,
  },
  row: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
  },
  pressed: {
    backgroundColor: color.softTeal,
  },
  rowTitle: {
    color: color.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
  rowMeta: {
    color: color.muted,
    fontSize: type.caption,
  },
});
