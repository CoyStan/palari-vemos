import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

export function WelcomeScreen() {
  const { openAddFriend, loadError, retryLoad } = useApp();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>Vemos</Text>
        <Text style={styles.title}>See the people you mean to see.</Text>
        <Text style={styles.body}>
          Mark when you’re free, pick a friend for a slot, and send a real invitation
          from your phone’s share sheet. Friends never need the app.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calendar first</Text>
        <Text style={styles.cardBody}>
          Your free times and invitations live in one week view — to send, sent,
          accepted, canceled, or moved.
        </Text>
      </View>

      {loadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Button label="Try again" variant="secondary" onPress={() => void retryLoad()} />
        </View>
      ) : null}

      <Button label="Add your first friend" onPress={() => openAddFriend('welcome')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: space.xl,
  },
  hero: {
    gap: space.md,
  },
  wordmark: {
    color: color.primary,
    fontSize: type.display,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  title: {
    color: color.ink,
    fontSize: type.title,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  body: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
    maxWidth: 340,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    gap: space.sm,
  },
  cardTitle: {
    color: color.ink,
    fontSize: type.section,
    fontWeight: '700',
  },
  cardBody: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: color.softCoral,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  errorText: {
    color: color.ink,
    fontSize: type.body,
    lineHeight: 22,
  },
});
