import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { CONTACT_OPTIONS, PRIORITY_OPTIONS } from '../domain/time';
import type { ContactMethod } from '../domain/types';
import { color, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

type Props = {
  mode: 'create' | 'edit';
};

export function FriendFormScreen({ mode }: Props) {
  const {
    data,
    editingFriendId,
    saveFriend,
    deleteFriend,
    goFriends,
    goCalendar,
  } = useApp();

  const existing = useMemo(
    () => (mode === 'edit'
      ? data.friends.find((friend) => friend.id === editingFriendId) ?? null
      : null),
    [data.friends, editingFriendId, mode],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    existing?.contactMethod ?? 'message',
  );
  const [priority, setPriority] = useState(existing?.priority ?? 3);
  const [saving, setSaving] = useState(false);

  const title = mode === 'edit' ? 'Edit friend' : 'Add a friend';
  const subtitle = mode === 'edit'
    ? 'Priority steers who shows up first when you tap a free slot.'
    : 'A name and a priority are enough. Higher priority means invite more often.';

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Add a name', 'A first name or nickname is enough.');
      return;
    }
    setSaving(true);
    try {
      await saveFriend(
        {
          name,
          note,
          contactMethod,
          priority,
          lastMetAt: existing?.lastMetAt ?? null,
        },
        existing?.id,
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!existing) {
      return;
    }
    Alert.alert(
      `Remove ${existing.name}?`,
      'This only removes them from Vemos on this phone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deleteFriend(existing.id);
          },
        },
      ],
    );
  };

  const onBack = () => {
    if (mode === 'edit' || data.friends.length > 0) {
      goFriends();
    } else {
      goCalendar();
    }
  };

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.back}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.form}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Ana"
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Loves morning walks"
        />
        <ChoiceRow
          label="How do you usually reach them?"
          options={CONTACT_OPTIONS}
          value={contactMethod}
          onChange={setContactMethod}
        />
        <ChoiceRow
          label="Priority to meet"
          options={PRIORITY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            hint: option.hint,
          }))}
          value={priority}
          onChange={setPriority}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label={mode === 'edit' ? 'Save changes' : 'Save friend'}
          loading={saving}
          onPress={() => void onSave()}
        />
        {mode === 'edit' ? (
          <Button label="Remove friend" variant="ghost" onPress={onDelete} />
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
    marginBottom: space.xl,
  },
  form: {
    gap: space.xl,
    marginBottom: space.xxl,
  },
  actions: {
    gap: space.md,
  },
});
