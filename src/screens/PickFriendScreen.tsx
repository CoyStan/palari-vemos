import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { formatSlotRange, lastSeenLine, priorityLabel } from '../domain/time';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

export function PickFriendScreen() {
  const {
    selectedSlot,
    sortedFriends,
    createInvitationForFriend,
    goCalendar,
    openAddFriend,
  } = useApp();

  if (!selectedSlot) {
    return null;
  }

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={goCalendar}
        style={styles.back}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Who to invite?</Text>
      <Text style={styles.subtitle}>
        {formatSlotRange(selectedSlot.startAt, selectedSlot.endAt)}
      </Text>
      <Text style={styles.hint}>
        Sorted by priority, then who you haven’t seen in a while.
      </Text>

      {sortedFriends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>Add a friend first.</Text>
          <Button label="Add a friend" onPress={() => openAddFriend('friends')} />
        </View>
      ) : (
        <View style={styles.list}>
          {sortedFriends.map((friend) => (
            <Pressable
              key={friend.id}
              accessibilityRole="button"
              accessibilityLabel={`Invite ${friend.name}`}
              onPress={() => void createInvitationForFriend(friend.id)}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Avatar name={friend.name} size={44} />
              <View style={styles.copy}>
                <Text style={styles.name}>{friend.name}</Text>
                <Text style={styles.meta}>{lastSeenLine(friend.lastMetAt)}</Text>
                <Text style={styles.priority}>
                  {priorityLabel(friend.priority)}
                  {friend.priority >= 4 ? ' · invite more often' : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
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
    color: color.ink,
    fontSize: type.body,
    fontWeight: '600',
    marginBottom: space.xs,
  },
  hint: {
    color: color.muted,
    fontSize: type.caption,
    lineHeight: 18,
    marginBottom: space.xl,
  },
  empty: {
    gap: space.md,
  },
  emptyBody: {
    color: color.muted,
    fontSize: type.body,
  },
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    minHeight: 72,
  },
  pressed: {
    backgroundColor: color.softTeal,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: color.ink,
    fontSize: type.body,
    fontWeight: '700',
  },
  meta: {
    color: color.muted,
    fontSize: type.caption,
  },
  priority: {
    color: color.primary,
    fontSize: type.caption,
    fontWeight: '600',
  },
  chevron: {
    color: color.muted,
    fontSize: 28,
  },
});
