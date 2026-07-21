import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ChoiceRow } from '../components/ChoiceRow';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import {
  DAY_LABELS_LONG,
  formatDateKey,
  minutesToLabel,
} from '../domain/time';
import { color, radius, space, type } from '../foundation';
import { useApp } from '../state/AppProvider';

const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const hour = 7 + i;
  const minutes = hour * 60;
  return { value: minutes, label: minutesToLabel(minutes) };
});

export function FreeTimesScreen() {
  const { data, addFreeBlock, deleteFreeBlock, goCalendar } = useApp();
  const [mode, setMode] = useState<'recurring' | 'oneoff'>('recurring');
  const [dayOfWeek, setDayOfWeek] = useState(2);
  const [date, setDate] = useState(formatDateKey(new Date()));
  const [startMinutes, setStartMinutes] = useState(18 * 60);
  const [endMinutes, setEndMinutes] = useState(20 * 60);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const recurring = useMemo(
    () => data.freeBlocks.filter((block) => block.kind === 'recurring'),
    [data.freeBlocks],
  );
  const oneOffs = useMemo(
    () => data.freeBlocks.filter((block) => block.kind === 'oneoff'),
    [data.freeBlocks],
  );

  const onAdd = async () => {
    if (endMinutes <= startMinutes) {
      Alert.alert('Check the times', 'End time needs to be after start time.');
      return;
    }
    if (mode === 'oneoff' && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Check the date', 'Use YYYY-MM-DD, for example 2026-07-22.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'recurring') {
        await addFreeBlock({
          kind: 'recurring',
          dayOfWeek,
          startMinutes,
          endMinutes,
          label,
        });
      } else {
        await addFreeBlock({
          kind: 'oneoff',
          date: date.trim(),
          startMinutes,
          endMinutes,
          label,
        });
      }
      setLabel('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to calendar"
        onPress={goCalendar}
        style={styles.back}
      >
        <Text style={styles.backText}>← Calendar</Text>
      </Pressable>

      <Text style={styles.title}>Free times</Text>
      <Text style={styles.subtitle}>
        Weekly defaults fill every week. One-off blocks are for a specific day.
      </Text>

      <View style={styles.modeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'recurring' }}
          onPress={() => setMode('recurring')}
          style={[styles.modeChip, mode === 'recurring' ? styles.modeChipOn : null]}
        >
          <Text style={[styles.modeText, mode === 'recurring' ? styles.modeTextOn : null]}>
            Weekly
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'oneoff' }}
          onPress={() => setMode('oneoff')}
          style={[styles.modeChip, mode === 'oneoff' ? styles.modeChipOn : null]}
        >
          <Text style={[styles.modeText, mode === 'oneoff' ? styles.modeTextOn : null]}>
            One-off
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        {mode === 'recurring' ? (
          <ChoiceRow
            label="Day of week"
            options={DAY_LABELS_LONG.map((dayLabel, index) => ({
              value: index,
              label: dayLabel,
            }))}
            value={dayOfWeek}
            onChange={setDayOfWeek}
          />
        ) : (
          <TextField
            label="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            placeholder="2026-07-22"
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <ChoiceRow
          label="Starts"
          options={HOUR_OPTIONS}
          value={startMinutes}
          onChange={(value) => {
            setStartMinutes(value);
            if (endMinutes <= value) {
              setEndMinutes(Math.min(value + 60, 22 * 60));
            }
          }}
        />
        <ChoiceRow
          label="Ends"
          options={HOUR_OPTIONS.filter((option) => option.value > startMinutes)}
          value={endMinutes > startMinutes ? endMinutes : Math.min(startMinutes + 60, 22 * 60)}
          onChange={setEndMinutes}
        />
        <TextField
          label="Label (optional)"
          value={label}
          onChangeText={setLabel}
          placeholder="Evening"
        />
        <Button label="Add free time" loading={saving} onPress={() => void onAdd()} />
      </View>

      <Text style={styles.section}>Weekly</Text>
      {recurring.length === 0 ? (
        <Text style={styles.empty}>No weekly free times yet.</Text>
      ) : (
        recurring.map((block) => (
          <View key={block.id} style={styles.blockRow}>
            <View style={styles.blockCopy}>
              <Text style={styles.blockTitle}>
                {DAY_LABELS_LONG[block.dayOfWeek]} · {minutesToLabel(block.startMinutes)} – {minutesToLabel(block.endMinutes)}
              </Text>
              {block.label ? <Text style={styles.blockMeta}>{block.label}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove free time"
              onPress={() => void deleteFreeBlock(block.id)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.section}>One-off</Text>
      {oneOffs.length === 0 ? (
        <Text style={styles.empty}>No one-off free times yet.</Text>
      ) : (
        oneOffs.map((block) => (
          <View key={block.id} style={styles.blockRow}>
            <View style={styles.blockCopy}>
              <Text style={styles.blockTitle}>
                {block.date} · {minutesToLabel(block.startMinutes)} – {minutesToLabel(block.endMinutes)}
              </Text>
              {block.label ? <Text style={styles.blockMeta}>{block.label}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove free time"
              onPress={() => void deleteFreeBlock(block.id)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
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
  modeRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.xl,
  },
  modeChip: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipOn: {
    borderColor: color.primary,
    backgroundColor: color.softTeal,
  },
  modeText: {
    color: color.muted,
    fontWeight: '600',
  },
  modeTextOn: {
    color: color.primary,
  },
  form: {
    gap: space.lg,
    marginBottom: space.xxl,
  },
  section: {
    color: color.ink,
    fontSize: type.section,
    fontWeight: '700',
    marginBottom: space.md,
    marginTop: space.sm,
  },
  empty: {
    color: color.muted,
    fontSize: type.body,
    marginBottom: space.lg,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    marginBottom: space.sm,
  },
  blockCopy: {
    flex: 1,
    gap: 2,
  },
  blockTitle: {
    color: color.ink,
    fontSize: type.body,
    fontWeight: '600',
  },
  blockMeta: {
    color: color.muted,
    fontSize: type.caption,
  },
  remove: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  removeText: {
    color: color.danger,
    fontWeight: '600',
  },
});
