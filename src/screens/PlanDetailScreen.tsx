import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedDialog } from '../components/AnimatedDialog';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import {
  buildInviteText,
  formatClock,
  INVITE_STATUS_LABELS,
  PLAN_STATUS_LABELS,
} from '../domain/model';
import type { InviteStatus, InviteTone, PlanStatus } from '../domain/types';
import { formatDayHeading } from '../domain/time';
import { hapticCelebrate, hapticSoft, hapticTick } from '../services/haptics';
import { useApp } from '../state/AppProvider';
import { useReduceMotion } from '../ui/useReduceMotion';
import { cn } from '../ui/cn';

const STATUS_OPTIONS: InviteStatus[] = [
  'not_invited',
  'waiting',
  'yes',
  'maybe',
  'no',
  'new_time',
  'moved',
];

const TONE_OPTIONS: { value: InviteTone; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'casual', label: 'Casual' },
  { value: 'playful', label: 'Playful' },
];

export function PlanDetailScreen() {
  const {
    activePlan,
    data,
    goBack,
    updatePlan,
    shareInvite,
    setFriendInviteStatus,
    markPlanStatus,
    savePlanMemory,
    openMoveFriend,
  } = useApp();

  const reduceMotion = useReduceMotion();
  const [title, setTitle] = useState('');
  const [activity, setActivity] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [inviteDrafts, setInviteDrafts] = useState<Record<string, string>>({});
  const [inviteTones, setInviteTones] = useState<Record<string, InviteTone>>({});
  const [statusFriendId, setStatusFriendId] = useState<string | null>(null);
  const [confirmFriendId, setConfirmFriendId] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryNote, setMemoryNote] = useState('');
  const [memoryPhoto, setMemoryPhoto] = useState<string | null>(null);

  const prevStatus = useRef<PlanStatus | null>(null);
  const bloom = useSharedValue(0);

  useEffect(() => {
    if (!activePlan) {
      return;
    }
    setTitle(activePlan.title);
    setActivity(activePlan.activity);
    setPlace(activePlan.place);
    setNote(activePlan.note);
    setInviteDrafts(
      Object.fromEntries(activePlan.friends.map((item) => [item.friendId, item.invitationText])),
    );

    // Celebrate the moment a plan turns on (someone said yes).
    const prev = prevStatus.current;
    prevStatus.current = activePlan.status;
    if (prev && prev !== 'on' && activePlan.status === 'on') {
      hapticCelebrate();
      if (!reduceMotion) {
        bloom.value = 0;
        bloom.value = withSequence(
          withTiming(1, { duration: 320 }),
          withTiming(0, { duration: 480 }),
        );
      }
    }
  }, [activePlan, bloom, reduceMotion]);

  const bloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + bloom.value * 0.035 }],
  }));

  if (!activePlan) {
    return (
      <Screen>
        <ScreenHeader title="Plan" onBack={goBack} />
        <Text className="text-body text-muted">Plan not found.</Text>
      </Screen>
    );
  }

  const start = new Date(activePlan.startAt);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const isDone = activePlan.status === 'done';

  const saveDetails = () => {
    void updatePlan({ title, activity, place, note });
  };

  const onShare = async (friendId: string, message: string) => {
    const shared = await shareInvite(friendId, message);
    if (shared) {
      hapticSoft();
      setConfirmFriendId(friendId);
    }
  };

  const onSetStatus = (friendId: string, status: InviteStatus) => {
    if (status === 'yes') {
      hapticCelebrate();
    } else {
      hapticTick();
    }
    void setFriendInviteStatus(friendId, status);
  };

  const onPickTone = (friendId: string, friendName: string, tone: InviteTone) => {
    hapticTick();
    setInviteTones((current) => ({ ...current, [friendId]: tone }));
    setInviteDrafts((current) => ({
      ...current,
      [friendId]: buildInviteText({
        name: friendName,
        startAt: activePlan.startAt,
        activity,
        place,
        timeFormat24h: data.settings.timeFormat24h,
        tone,
      }),
    }));
  };

  const onMarkDone = async () => {
    await markPlanStatus('done');
    hapticCelebrate();
    setMemoryNote(activePlan.memoryNote);
    setMemoryPhoto(activePlan.memoryPhotoUri);
    setMemoryOpen(true);
  };

  const onPickMemoryPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setMemoryPhoto(result.assets[0].uri);
    }
  };

  const onSaveMemory = async () => {
    await savePlanMemory(memoryNote.trim(), memoryPhoto);
    hapticCelebrate();
    setMemoryOpen(false);
  };

  const confirmFriend = confirmFriendId
    ? data.friends.find((entry) => entry.id === confirmFriendId) ?? null
    : null;

  return (
    <Screen contentClassName="gap-5">
      <ScreenHeader title="Plan" onBack={goBack} />

      <Animated.View style={bloomStyle}>
        <Card elevation="lift" className="gap-1 p-5">
          <Text className="font-sans-semibold text-caption text-muted">
            {formatDayHeading(start)} · {formatClock(startMin, data.settings.timeFormat24h)}
          </Text>
          <Text className="font-sans-bold text-title text-ink">{activePlan.title}</Text>
          <Text className="text-body text-primary">{PLAN_STATUS_LABELS[activePlan.status]}</Text>
        </Card>
      </Animated.View>

      {activePlan.status === 'on' ? (
        <View className="rounded-card bg-coral-soft p-4">
          <Text className="font-sans-semibold text-body text-coral-deep">
            It’s happening. Tell them you’re looking forward to it.
          </Text>
        </View>
      ) : null}

      {isDone ? (
        <Card className="gap-3 p-5">
          <Text className="font-sans-bold text-section text-ink">The memory</Text>
          {activePlan.memoryPhotoUri ? (
            <Image
              source={{ uri: activePlan.memoryPhotoUri }}
              accessibilityLabel="Memory photo"
              className="h-40 w-full rounded-control bg-border"
            />
          ) : null}
          {activePlan.memoryNote ? (
            <Text className="text-body text-ink">{activePlan.memoryNote}</Text>
          ) : (
            <Text className="text-body text-muted">
              Nothing captured yet — future you will thank present you.
            </Text>
          )}
          <Button
            label={activePlan.memoryNote || activePlan.memoryPhotoUri ? 'Edit memory' : 'Add a memory'}
            variant="secondary"
            onPress={() => {
              setMemoryNote(activePlan.memoryNote);
              setMemoryPhoto(activePlan.memoryPhotoUri);
              setMemoryOpen(true);
            }}
          />
        </Card>
      ) : (
        <>
          <TextField label="Title" value={title} onChangeText={setTitle} onBlur={saveDetails} />
          <TextField label="Activity" value={activity} onChangeText={setActivity} onBlur={saveDetails} />
          <TextField label="Place" value={place} onChangeText={setPlace} onBlur={saveDetails} />
          <TextField label="Note" value={note} onChangeText={setNote} onBlur={saveDetails} />

          <View className="gap-3">
            <Text className="font-sans-bold text-section text-ink">Invitations</Text>
            {activePlan.friends.map((item) => {
              if (item.status === 'moved') {
                return null;
              }
              const friend = data.friends.find((entry) => entry.id === item.friendId);
              if (!friend) {
                return null;
              }
              const draft = inviteDrafts[item.friendId] ?? item.invitationText;
              const tone = inviteTones[item.friendId] ?? 'warm';
              return (
                <Card key={item.friendId} className="gap-3 p-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="font-sans-bold text-body text-ink">{friend.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Change status for ${friend.name}`}
                      onPress={() => setStatusFriendId(item.friendId)}
                      className="min-h-[36px] justify-center rounded-full bg-primary-soft px-3 py-1.5 active:bg-primary-softBorder"
                    >
                      <Text className="text-caption font-sans-semibold text-primary">
                        {INVITE_STATUS_LABELS[item.status]}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="flex-row gap-2">
                    {TONE_OPTIONS.map((option) => {
                      const selected = tone === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${option.label} tone`}
                          onPress={() => onPickTone(item.friendId, friend.name, option.value)}
                          className={cn(
                            'min-h-[36px] items-center justify-center rounded-full px-3',
                            selected ? 'bg-primary-soft' : 'bg-canvas',
                          )}
                        >
                          <Text
                            className={cn(
                              'text-caption font-sans-semibold',
                              selected ? 'text-primary' : 'text-muted',
                            )}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <TextField
                    label="Invitation"
                    value={draft}
                    onChangeText={(text) => {
                      setInviteDrafts((current) => ({ ...current, [item.friendId]: text }));
                    }}
                    multiline
                    className="min-h-[96px]"
                  />
                  <Button
                    label={`Share with ${friend.name}`}
                    onPress={() => void onShare(item.friendId, draft)}
                  />
                  {item.status === 'new_time' ? (
                    <Button
                      label="Move to another plan"
                      variant="secondary"
                      onPress={() => openMoveFriend(item.friendId)}
                    />
                  ) : null}
                </Card>
              );
            })}
          </View>
        </>
      )}

      <View className="gap-2">
        <Text className="font-sans-bold text-section text-ink">Plan</Text>
        {!isDone ? (
          <Button label="Mark done" onPress={() => void onMarkDone()} />
        ) : null}
        {!isDone ? (
          <Button label="Cancel plan" variant="ghost" onPress={() => void markPlanStatus('cancelled')} />
        ) : null}
      </View>

      <AnimatedDialog
        visible={statusFriendId !== null}
        onClose={() => setStatusFriendId(null)}
        accessibilityLabel="Update reply"
      >
        <View className="gap-1 px-5 pb-4">
          <Text className="mb-2 font-sans-bold text-section text-ink">
            How did they reply?
          </Text>
          {STATUS_OPTIONS.filter((status) => status !== 'moved').map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityLabel={INVITE_STATUS_LABELS[status]}
              onPress={() => {
                if (statusFriendId) {
                  onSetStatus(statusFriendId, status);
                }
                setStatusFriendId(null);
              }}
              className={cn(
                'min-h-[48px] justify-center border-b border-border py-3 active:bg-primary-soft',
              )}
            >
              <Text className="text-body text-ink">{INVITE_STATUS_LABELS[status]}</Text>
            </Pressable>
          ))}
          {statusFriendId ? (
            <Button
              className="mt-4"
              label="Move to another plan"
              variant="secondary"
              onPress={() => {
                openMoveFriend(statusFriendId);
                setStatusFriendId(null);
              }}
            />
          ) : null}
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={confirmFriendId !== null}
        onClose={() => setConfirmFriendId(null)}
        accessibilityLabel="Mark as invited"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">
            Mark {confirmFriend?.name ?? 'them'} as invited?
          </Text>
          <Text className="text-body text-muted">
            Android can’t always tell if the message was sent. Mark them as
            waiting so you remember who you’re expecting a reply from.
          </Text>
          <Button
            label="Mark waiting"
            onPress={() => {
              if (confirmFriendId) {
                onSetStatus(confirmFriendId, 'waiting');
              }
              setConfirmFriendId(null);
            }}
          />
          <Button
            label="Not now"
            variant="ghost"
            onPress={() => setConfirmFriendId(null)}
          />
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        accessibilityLabel="Capture the memory"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">How was it?</Text>
          <Text className="text-body text-muted">
            A line or a photo — just for you, saved on this phone.
          </Text>
          {memoryPhoto ? (
            <Image
              source={{ uri: memoryPhoto }}
              accessibilityLabel="Memory photo"
              className="h-36 w-full rounded-control bg-border"
            />
          ) : null}
          <Button
            label={memoryPhoto ? 'Change photo' : 'Add a photo'}
            variant="secondary"
            onPress={() => void onPickMemoryPhoto()}
          />
          <TextField
            label="One line about it"
            value={memoryNote}
            onChangeText={setMemoryNote}
            placeholder="She brought the photo album…"
            multiline
            className="min-h-[72px]"
          />
          <Button label="Save memory" onPress={() => void onSaveMemory()} />
          <Button label="Maybe later" variant="ghost" onPress={() => setMemoryOpen(false)} />
        </View>
      </AnimatedDialog>
    </Screen>
  );
}
