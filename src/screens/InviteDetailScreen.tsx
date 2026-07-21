import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { buildInvitationText, STATUS_LABELS } from '../domain/invitation';
import { formatSlotRange } from '../domain/time';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

export function InviteDetailScreen() {
  const {
    activeFriend,
    activeInvitation,
    updateInvitationFields,
    tryAnotherIdea,
    shareInvitation,
    setInvitationStatus,
    openMoveInvite,
    goCalendar,
  } = useApp();

  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!activeInvitation || !activeFriend) {
      goCalendar();
    }
  }, [activeFriend, activeInvitation, goCalendar]);

  if (!activeInvitation || !activeFriend) {
    return null;
  }

  const firstName = activeFriend.name.split(' ')[0] ?? activeFriend.name;
  const canAct = activeInvitation.status === 'to_send' || activeInvitation.status === 'sent';

  const syncText = (idea: string, place: string) => {
    updateInvitationFields({
      idea,
      place,
      invitationText: buildInvitationText({
        name: activeFriend.name,
        idea,
        place,
        startAt: activeInvitation.startAt,
        endAt: activeInvitation.endAt,
      }),
    });
  };

  const onShare = async () => {
    if (!activeInvitation.invitationText.trim()) {
      Alert.alert('Write a short invite', 'Edit the message, then share it.');
      return;
    }
    setSharing(true);
    try {
      await shareInvitation(activeInvitation.invitationText);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={goCalendar}
        style={styles.back}
      >
        <Text style={styles.backText}>← Calendar</Text>
      </Pressable>

      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{STATUS_LABELS[activeInvitation.status]}</Text>
      </View>

      <Text style={styles.title}>Invite {firstName}</Text>
      <Text style={styles.when}>
        {formatSlotRange(activeInvitation.startAt, activeInvitation.endAt)}
      </Text>

      <View style={styles.form}>
        <TextField
          label="Activity"
          value={activeInvitation.idea}
          onChangeText={(idea) => syncText(idea, activeInvitation.place)}
          editable={canAct}
        />
        <TextField
          label="Place (optional)"
          value={activeInvitation.place}
          onChangeText={(place) => syncText(activeInvitation.idea, place)}
          editable={canAct}
        />
        {canAct ? (
          <Button label="Try another idea" variant="secondary" onPress={tryAnotherIdea} />
        ) : null}
      </View>

      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Invitation</Text>
        <TextField
          label="Message"
          value={activeInvitation.invitationText}
          onChangeText={(invitationText) => updateInvitationFields({ invitationText })}
          multiline
          style={styles.inviteInput}
          textAlignVertical="top"
          editable={canAct}
        />
      </View>

      <View style={styles.actions}>
        {activeInvitation.status === 'to_send' || activeInvitation.status === 'sent' ? (
          <Button
            label={activeInvitation.status === 'to_send' ? 'Share invitation' : 'Share again'}
            loading={sharing}
            onPress={() => void onShare()}
          />
        ) : null}

        {canAct ? (
          <>
            <Button
              label="Mark accepted"
              variant="secondary"
              onPress={() => void setInvitationStatus('accepted')}
            />
            <Button
              label="Move to another time"
              variant="ghost"
              onPress={openMoveInvite}
            />
            <Button
              label="Cancel invitation"
              variant="ghost"
              onPress={() => void setInvitationStatus('canceled')}
            />
          </>
        ) : null}

        {!canAct ? (
          <Button label="Back to calendar" variant="secondary" onPress={goCalendar} />
        ) : null}
      </View>
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
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: color.softTeal,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginBottom: space.md,
  },
  statusText: {
    color: color.primary,
    fontSize: type.caption,
    fontWeight: '700',
  },
  title: {
    color: color.ink,
    fontSize: type.title,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: space.sm,
  },
  when: {
    color: color.muted,
    fontSize: type.body,
    lineHeight: 24,
    marginBottom: space.xl,
  },
  form: {
    gap: space.lg,
    marginBottom: space.xl,
  },
  inviteCard: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.xl,
  },
  inviteLabel: {
    color: color.primary,
    fontSize: type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inviteInput: {
    minHeight: 110,
    paddingTop: space.md,
  },
  actions: {
    gap: space.md,
  },
});
