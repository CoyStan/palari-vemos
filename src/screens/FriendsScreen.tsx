import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { lastSeenLine, priorityLabel } from '../domain/time';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

export function FriendsScreen() {
  const { data, sortedFriends, openAddFriend, openEditFriend } = useApp();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>Friends</Text>
          <Text style={styles.subtitle}>Last met · priority to meet</Text>
        </View>
        <Button
          label="Add"
          variant="secondary"
          onPress={() => openAddFriend('friends')}
          style={styles.addButton}
        />
      </View>

      {data.friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyBody}>
            Add a few people. Higher priority means they show up first when you tap a free slot.
          </Text>
          <Button label="Add a friend" onPress={() => openAddFriend('friends')} />
        </View>
      ) : (
        <View style={styles.list}>
          {sortedFriends.map((friend) => (
            <Pressable
              key={friend.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${friend.name}`}
              onPress={() => openEditFriend(friend.id)}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Avatar name={friend.name} size={48} />
              <View style={styles.copy}>
                <Text style={styles.name}>{friend.name}</Text>
                <Text style={styles.meta}>{lastSeenLine(friend.lastMetAt)}</Text>
                <Text style={styles.priority}>
                  Priority: {priorityLabel(friend.priority)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xl,
    gap: space.md,
  },
  wordmark: {
    color: color.ink,
    fontSize: type.title,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: color.muted,
    fontSize: type.body,
    marginTop: 2,
  },
  addButton: {
    minWidth: 88,
    paddingHorizontal: space.lg,
  },
  empty: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    gap: space.md,
  },
  emptyTitle: {
    color: color.ink,
    fontSize: type.section,
    fontWeight: '700',
  },
  emptyBody: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
  },
  list: {
    gap: space.md,
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
    lineHeight: 18,
  },
  priority: {
    color: color.primary,
    fontSize: type.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  chevron: {
    color: color.muted,
    fontSize: 28,
    lineHeight: 28,
  },
});
