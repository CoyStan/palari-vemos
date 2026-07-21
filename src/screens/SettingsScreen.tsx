import { Alert, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { color } from '../foundation';
import { ensureNotificationPermission } from '../services/reminders';
import { useApp } from '../state/AppProvider';
import type { ReactNode } from 'react';

function hourLabel(hour: number, timeFormat24h: boolean): string {
  if (hour === 24) {
    return timeFormat24h ? '24:00' : 'Midnight';
  }
  if (timeFormat24h) {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

const CALENDAR_START_HOURS = [5, 6, 7, 8, 9, 10];
const CALENDAR_END_HOURS = [18, 19, 20, 21, 22, 23, 24];

export function SettingsScreen() {
  const { data, updateSettings, exportData, wipeData, openAvailability } = useApp();
  const settings = data.settings;

  const calendarStartOptions = CALENDAR_START_HOURS.map((hour) => ({
    value: hour,
    label: hourLabel(hour, settings.timeFormat24h),
  }));
  const calendarEndOptions = CALENDAR_END_HOURS.map((hour) => ({
    value: hour,
    label: hourLabel(hour, settings.timeFormat24h),
  }));

  const toggle = (key: keyof typeof settings, value: boolean) => {
    void updateSettings({ [key]: value });
  };

  const onEnableNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications off',
          'Permission wasn’t granted. You can turn reminders on later in system settings.',
        );
        return;
      }
    }
    await updateSettings({ notificationsEnabled: enabled });
  };

  const onExport = async () => {
    const json = await exportData();
    try {
      await Share.share({ message: json, title: 'So, When? data export' });
    } catch {
      Alert.alert('Export ready', 'Could not open the share sheet. Try again.');
    }
  };

  const onWipe = () => {
    Alert.alert(
      'Delete all data?',
      'This removes friends, availability, and plans from this phone. It cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            void wipeData();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas font-sans" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-3"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-sans-bold text-[28px] tracking-[-1px] text-ink">Settings</Text>
          <Text className="text-caption text-muted">Quiet defaults. Everything stays local.</Text>
        </View>

        <Section title="Availability">
          <Button label="Manage availability" variant="secondary" onPress={openAvailability} />
        </Section>

        <Section title="Reminders">
          <ToggleRow
            label="Local reminders"
            hint="Optional, quiet, and on-device only"
            value={settings.notificationsEnabled}
            onValueChange={(value) => void onEnableNotifications(value)}
          />
          <ToggleRow
            label="Free-time nudge"
            value={settings.notifyFreeSlots}
            onValueChange={(value) => toggle('notifyFreeSlots', value)}
            disabled={!settings.notificationsEnabled}
          />
          <ToggleRow
            label="Catch-up nudge"
            value={settings.notifyCatchUpDue}
            onValueChange={(value) => toggle('notifyCatchUpDue', value)}
            disabled={!settings.notificationsEnabled}
          />
          <ToggleRow
            label="Waiting follow-up"
            value={settings.notifyWaitingFollowUp}
            onValueChange={(value) => toggle('notifyWaitingFollowUp', value)}
            disabled={!settings.notificationsEnabled}
          />
          <ToggleRow
            label="Plan tomorrow"
            value={settings.notifyPlanTomorrow}
            onValueChange={(value) => toggle('notifyPlanTomorrow', value)}
            disabled={!settings.notificationsEnabled}
          />
          <ToggleRow
            label="Ask if it happened"
            value={settings.notifyAskIfHappened}
            onValueChange={(value) => toggle('notifyAskIfHappened', value)}
            disabled={!settings.notificationsEnabled}
          />
        </Section>

        <Section title="Defaults">
          <ChoiceChips
            label="Default plan duration"
            options={[
              { value: 60, label: '1 hour' },
              { value: 90, label: '1.5 hours' },
              { value: 120, label: '2 hours' },
              { value: 180, label: '3 hours' },
            ]}
            value={settings.defaultDurationMinutes}
            onChange={(value) => void updateSettings({ defaultDurationMinutes: value })}
          />
          <ChoiceChips
            label="First day of week"
            options={[
              { value: 0, label: 'Sunday' },
              { value: 1, label: 'Monday' },
            ]}
            value={settings.firstDayOfWeek}
            onChange={(value) => void updateSettings({ firstDayOfWeek: value })}
          />
          <ToggleRow
            label="24-hour time"
            value={settings.timeFormat24h}
            onValueChange={(value) => toggle('timeFormat24h', value)}
          />
          <Text className="text-caption text-muted">
            Calendar hours only change how much of the day you see in Week/Day — not your availability.
          </Text>
          <ChoiceChips
            label="Calendar starts at"
            options={calendarStartOptions}
            value={settings.calendarDayStartHour}
            onChange={(value) => {
              const end = Math.max(settings.calendarDayEndHour, value + 1);
              void updateSettings({ calendarDayStartHour: value, calendarDayEndHour: end });
            }}
          />
          <ChoiceChips
            label="Calendar ends at"
            options={calendarEndOptions}
            value={settings.calendarDayEndHour}
            onChange={(value) => {
              const end = Math.max(value, settings.calendarDayStartHour + 1);
              void updateSettings({ calendarDayEndHour: end });
            }}
          />
        </Section>

        <Section title="Privacy">
          <Text className="text-body text-muted">
            So, When? stores friends, availability, and plans only on this device.
            Friends do not need the app. Contacts are never scanned or uploaded —
            you choose one contact at a time when you want to copy a name or number.
          </Text>
          <Button label="Export data" variant="secondary" onPress={() => void onExport()} />
          <Button label="Delete all data" variant="ghost" onPress={onWipe} />
        </Section>

        <Section title="About">
          <Text className="text-body text-muted">
            So, When? is made by Palari Labs. Version 1 is a private organizer —
            not a social network.
          </Text>
          <Text className="text-caption text-muted">Privacy policy coming with the Play listing.</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-3 p-5">
      <Text className="font-sans-bold text-section text-ink">{title}</Text>
      {children}
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="min-h-[52px] flex-row items-center justify-between gap-3 py-1 opacity-100">
      <View className="flex-1">
        <Text className="text-body text-ink">{label}</Text>
        {hint ? <Text className="text-caption text-muted">{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: color.border, true: color.softTeal }}
        thumbColor={value ? color.primary : '#FFFFFF'}
      />
    </View>
  );
}

function ChoiceChips<T extends number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-caption font-sans-semibold text-ink">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              className={`min-h-[44px] rounded-full border px-4 py-2 ${
                selected ? 'border-primary bg-primary-soft' : 'border-border bg-canvas'
              }`}
            >
              <Text className={`font-sans-semibold text-caption ${selected ? 'text-primary' : 'text-ink'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
