import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DateSlotPicker } from '../components/DateSlotPicker';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import type { AvailabilityKind, Recurrence } from '../domain/types';
import { DAY_LABELS, formatDateKey } from '../domain/time';
import { hapticTick } from '../services/haptics';
import { useApp } from '../state/AppProvider';
import { cn } from '../ui/cn';

type PresetId = 'weeknights' | 'friday' | 'saturday' | 'sunday' | 'custom' | 'oneoff';

const PRESETS: { id: PresetId; label: string; hint: string }[] = [
  { id: 'weeknights', label: 'Weeknights', hint: 'Mon–Thu · 7–10 PM' },
  { id: 'friday', label: 'Friday night', hint: 'Friday · 7–11 PM' },
  { id: 'saturday', label: 'Saturday afternoon', hint: 'Saturday · 2–6 PM' },
  { id: 'sunday', label: 'Sunday brunch', hint: 'Sunday · 10 AM–1 PM' },
  { id: 'custom', label: 'Custom recurring', hint: 'Pick days and times' },
  { id: 'oneoff', label: 'One-time slot', hint: 'A single free window' },
];

export function AddAvailabilityScreen() {
  const { addAvailability, goBack, data } = useApp();
  const today = formatDateKey(new Date());
  const timeFormat24h = data.settings.timeFormat24h;

  const [preset, setPreset] = useState<PresetId>('weeknights');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4]);
  const [startMinutes, setStartMinutes] = useState(19 * 60);
  const [endMinutes, setEndMinutes] = useState(22 * 60);
  const [recurrence, setRecurrence] = useState<Recurrence>('weekly');
  const [oneOffDate, setOneOffDate] = useState(today);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const applyPreset = (id: PresetId) => {
    hapticTick();
    setPreset(id);
    if (id === 'weeknights') {
      setDaysOfWeek([1, 2, 3, 4]);
      setStartMinutes(19 * 60);
      setEndMinutes(22 * 60);
      setRecurrence('weekly');
      setLabel('Weeknights');
    } else if (id === 'friday') {
      setDaysOfWeek([5]);
      setStartMinutes(19 * 60);
      setEndMinutes(23 * 60);
      setRecurrence('weekly');
      setLabel('Friday night');
    } else if (id === 'saturday') {
      setDaysOfWeek([6]);
      setStartMinutes(14 * 60);
      setEndMinutes(18 * 60);
      setRecurrence('weekly');
      setLabel('Saturday afternoon');
    } else if (id === 'sunday') {
      setDaysOfWeek([0]);
      setStartMinutes(10 * 60);
      setEndMinutes(13 * 60);
      setRecurrence('weekly');
      setLabel('Sunday brunch');
    } else if (id === 'oneoff') {
      setLabel('One-time');
      setStartMinutes(16 * 60);
      setEndMinutes(18 * 60);
    } else {
      setLabel('');
    }
  };

  const toggleDay = (day: number) => {
    hapticTick();
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
    setPreset('custom');
  };

  const onTimeChange = (which: 'start' | 'end', minutes: number) => {
    setPreset('custom');
    if (which === 'start') {
      setStartMinutes(minutes);
    } else {
      setEndMinutes(minutes);
    }
  };

  const kind: AvailabilityKind = preset === 'oneoff' ? 'oneoff' : 'recurring';

  const onSave = async () => {
    if (endMinutes <= startMinutes) {
      Alert.alert('Check times', 'End time must be after start time.');
      return;
    }
    if (kind === 'recurring' && daysOfWeek.length === 0) {
      Alert.alert('Pick a day', 'Choose at least one day of the week.');
      return;
    }
    setSaving(true);
    try {
      await addAvailability({
        kind,
        label: label.trim() || (kind === 'oneoff' ? 'You\'re free' : 'Free time'),
        daysOfWeek: kind === 'oneoff' ? [] : daysOfWeek,
        startMinutes,
        endMinutes,
        recurrence,
        startDate: kind === 'oneoff' ? oneOffDate : today,
        endDate: null,
        oneOffDate: kind === 'oneoff' ? oneOffDate : null,
        enabled: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentClassName="gap-6">
      <ScreenHeader title="When are you free?" onBack={goBack} />
      <Text className="text-body text-muted">
        Pick a preset, then tap the time fields to fine-tune.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-1"
      >
        {PRESETS.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: preset === item.id }}
            accessibilityLabel={`${item.label}: ${item.hint}`}
            onPress={() => applyPreset(item.id)}
            className={cn(
              'min-w-[120px] items-center justify-center rounded-card px-4 py-3',
              preset === item.id
                ? 'bg-primary'
                : 'bg-surface border border-border',
            )}
          >
            <Text
              className={cn(
                'font-sans-bold text-body',
                preset === item.id ? 'text-white' : 'text-ink',
              )}
            >
              {item.label}
            </Text>
            <Text
              className={cn(
                'mt-0.5 text-caption',
                preset === item.id ? 'text-white/80' : 'text-muted',
              )}
            >
              {item.hint}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {kind === 'recurring' ? (
        <View className="gap-2">
          <Text className="text-caption font-sans-semibold text-ink">Days</Text>
          <View className="flex-row flex-wrap gap-2">
            {DAY_LABELS.map((dayLabel, index) => {
              const selected = daysOfWeek.includes(index);
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={dayLabel}
                  onPress={() => toggleDay(index)}
                  className={cn(
                    'h-12 w-12 items-center justify-center rounded-full',
                    selected ? 'bg-primary' : 'bg-surface border border-border',
                  )}
                >
                  <Text
                    className={cn(
                      'text-center font-sans-bold text-caption leading-5',
                      selected ? 'text-white' : 'text-ink',
                    )}
                  >
                    {dayLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {kind === 'oneoff' ? (
        <DateSlotPicker
          label="Date"
          date={oneOffDate}
          onChange={setOneOffDate}
        />
      ) : null}

      <Card className="gap-3">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <TimeSlotPicker
              label="Start"
              minutes={startMinutes}
              onChange={(minutes) => onTimeChange('start', minutes)}
              timeFormat24h={timeFormat24h}
            />
          </View>
          <View className="flex-1">
            <TimeSlotPicker
              label="End"
              minutes={endMinutes}
              onChange={(minutes) => onTimeChange('end', minutes)}
              timeFormat24h={timeFormat24h}
            />
          </View>
        </View>
      </Card>

      {kind === 'recurring' ? (
        <View className="gap-2">
          <Text className="text-caption font-sans-semibold text-ink">Repeat</Text>
          <View className="flex-row gap-2">
            {([
              ['weekly', 'Every week'],
              ['biweekly', 'Every 2 weeks'],
            ] as [Recurrence, string][]).map(([id, lbl]) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: recurrence === id }}
                onPress={() => { hapticTick(); setRecurrence(id); }}
                className={cn(
                  'flex-1 min-h-[44px] items-center justify-center rounded-full',
                  recurrence === id
                    ? 'bg-primary-soft border border-primary'
                    : 'bg-surface border border-border',
                )}
              >
                <Text className={cn('text-center font-sans-semibold text-caption leading-5', recurrence === id ? 'text-primary' : 'text-ink')}>
                  {lbl}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <TextField
        label="Label (optional)"
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Friday night"
      />

      <Button label="Save availability" loading={saving} onPress={() => void onSave()} />
    </Screen>
  );
}
