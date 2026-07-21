import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { ACTIVITY_OPTIONS, catchUpStatus, formatClock } from '../domain/model';
import { formatDayHeading } from '../domain/time';
import { color, shadowSoft } from '../foundation';
import { useApp } from '../state/AppProvider';
import { cn } from '../ui/cn';

export function CreatePlanScreen() {
  const {
    selectedSlot,
    selectedFriendIds,
    sortedFriends,
    toggleFriendSelection,
    createPlan,
    goBack,
    openAddFriend,
    data,
  } = useApp();

  const [step, setStep] = useState<'friends' | 'details'>(
    selectedFriendIds.length > 0 ? 'details' : 'friends',
  );
  const [activity, setActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const slotLabel = useMemo(() => {
    if (!selectedSlot) {
      return '';
    }
    const start = new Date(selectedSlot.startAt);
    return `${formatDayHeading(start)} · ${formatClock(selectedSlot.startMinutes, data.settings.timeFormat24h)}`;
  }, [data.settings.timeFormat24h, selectedSlot]);

  if (!selectedSlot) {
    return (
      <Screen>
        <ScreenHeader title="Make a plan" onBack={goBack} />
        <Text className="text-body text-muted">Pick a free time from When first.</Text>
      </Screen>
    );
  }

  const resolvedActivity = activity === 'custom' ? customActivity.trim() : activity;

  const onContinue = () => {
    if (selectedFriendIds.length === 0) {
      Alert.alert('Choose friends', 'Select at least one person to invite.');
      return;
    }
    setStep('details');
  };

  const onCreate = async () => {
    setSaving(true);
    try {
      await createPlan({
        title,
        activity: resolvedActivity,
        place,
        note,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentClassName="gap-4">
      <ScreenHeader
        title={step === 'friends' ? 'Who’s coming?' : 'Plan details'}
        onBack={step === 'friends' ? goBack : () => setStep('friends')}
      />
      <View className="gap-1">
        <View className="self-start rounded-full bg-primary-soft px-3 py-1.5">
          <Text className="text-caption font-sans-semibold text-primary">{slotLabel}</Text>
        </View>
        <Text className="text-caption text-muted">
          {step === 'friends' ? 'Step 1 of 2 · Pick your people' : 'Step 2 of 2 · Make it yours'}
        </Text>
      </View>

      {step === 'friends' ? (
        <>
          {sortedFriends.length === 0 ? (
            <Card className="gap-3">
              <Text className="text-body text-muted">Add a friend before making a plan.</Text>
              <Button label="Add a friend" onPress={openAddFriend} />
            </Card>
          ) : (
            <View className="gap-2">
              {sortedFriends.map((friend) => {
                const selected = selectedFriendIds.includes(friend.id);
                const due = catchUpStatus(friend) === 'due';
                return (
                  <Pressable
                    key={friend.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={friend.name}
                    onPress={() => toggleFriendSelection(friend.id)}
                    className={cn(
                      'flex-row items-center gap-3 rounded-card p-3',
                      selected ? 'border border-primary bg-primary-soft' : 'bg-surface',
                    )}
                    style={selected ? undefined : shadowSoft}
                  >
                    <Avatar name={friend.name} photoUri={friend.photoUri} size={44} />
                    <View className="flex-1">
                      <Text className="font-sans-bold text-body text-ink">{friend.name}</Text>
                      <Text className="text-caption text-muted">
                        {due ? 'Due for a catch-up' : 'Available'}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        'h-6 w-6 items-center justify-center rounded-full border',
                        selected ? 'border-primary bg-primary' : 'border-border',
                      )}
                    >
                      {selected ? <Icon name="check" size={14} color={color.primaryText} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Button label="Continue" onPress={onContinue} disabled={selectedFriendIds.length === 0} />
        </>
      ) : (
        <>
          <TextField
            label="Title (optional)"
            value={title}
            onChangeText={setTitle}
            placeholder="Catch up with…"
          />

          <View className="gap-2">
            <Text className="text-caption font-sans-semibold text-ink">Activity (optional)</Text>
            <View className="flex-row flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map((option) => {
                const selected = activity === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setActivity(selected ? '' : option)}
                    className={cn(
                      'min-h-[44px] items-center justify-center rounded-full border px-4',
                      selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                    )}
                  >
                    <Text className={cn('text-center font-sans-semibold text-caption leading-5', selected ? 'text-primary' : 'text-ink')}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setActivity(activity === 'custom' ? '' : 'custom')}
                className={cn(
                  'min-h-[44px] items-center justify-center rounded-full border px-4',
                  activity === 'custom' ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                )}
              >
                <Text className={cn('text-center font-sans-semibold text-caption leading-5', activity === 'custom' ? 'text-primary' : 'text-ink')}>
                  custom
                </Text>
              </Pressable>
            </View>
            {activity === 'custom' ? (
              <TextField
                label="Custom activity"
                value={customActivity}
                onChangeText={setCustomActivity}
                placeholder="Board games"
              />
            ) : null}
          </View>

          <TextField
            label="Place (optional)"
            value={place}
            onChangeText={setPlace}
            placeholder="Bar Central"
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="Bring the photo album"
          />

          <Button label="Create plan" loading={saving} onPress={() => void onCreate()} />
        </>
      )}
    </Screen>
  );
}
