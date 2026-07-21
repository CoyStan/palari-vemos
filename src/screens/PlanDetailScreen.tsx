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
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import {
  formatClock,
  INVITE_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  SHARE_OPTIONS,
} from '../domain/model';
import type { InviteStatus, InviteTone } from '../domain/types';
import { formatDayHeading } from '../domain/time';
import { hapticCelebrate, hapticSoft, hapticTick } from '../services/haptics';
import { useApp } from '../state/AppProvider';
import { useReduceMotion } from '../ui/useReduceMotion';
import { cn } from '../ui/cn';

const RESPONSE_CHOICES: { status: InviteStatus; label: string }[] = [
  { status: 'yes', label: 'Yes' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'no', label: 'Can’t make it' },
  { status: 'new_time', label: 'Suggest another time' },
];

const LABEL_STATUSES: InviteStatus[] = ['not_invited', 'waiting', 'moved'];

const TONE_OPTIONS: { value: InviteTone; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'casual', label: 'Casual' },
  { value: 'playful', label: 'Playful' },
];

export function PlanDetailScreen() {
  const {
    activePlan,
    data,
    now,
    goBack,
    updatePlan,
    shareInvite,
    setFriendInviteStatus,
    updateInvitationText,
    resetInvitationSuggested,
    confirmInviteSent,
    markPlanDone,
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
  const [editingInvite, setEditingInvite] = useState<Record<string, boolean>>({});
  const [styleFriendId, setStyleFriendId] = useState<string | null>(null);
  const [confirmFriendId, setConfirmFriendId] = useState<string | null>(null);
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [doneFutureOpen, setDoneFutureOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryNote, setMemoryNote] = useState('');
  const [memoryPhoto, setMemoryPhoto] = useState<string | null>(null);

  const prevStatus = useRef<string | null>(null);
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
  const end = new Date(activePlan.endAt);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const isDone = activePlan.status === 'done';
  const isCancelled = activePlan.status === 'cancelled';
  const planFriends = activePlan.friends.filter((item) => item.status !== 'moved');

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

  const saveInviteText = (friendId: string) => {
    const text = inviteDrafts[friendId];
    if (text === undefined) return;
    void updateInvitationText(friendId, text);
    setEditingInvite((current) => ({ ...current, [friendId]: false }));
  };

  const onPickTone = (friendId: string, tone: InviteTone) => {
    hapticTick();
    void resetInvitationSuggested(friendId, tone);
    setStyleFriendId(null);
  };

  const openAttendancePicker = () => {
    const preselected = activePlan.friends
      .filter((item) => item.status === 'yes')
      .map((item) => item.friendId);
    setAttendedIds(preselected);
    setAttendanceOpen(true);
  };

  const onMarkDonePress = () => {
    if (end.getTime() > now.getTime()) {
      setDoneFutureOpen(true);
      return;
    }
    openAttendancePicker();
  };

  const onConfirmDoneFuture = () => {
    setDoneFutureOpen(false);
    openAttendancePicker();
  };

  const onConfirmAttendance = async () => {
    await markPlanDone(attendedIds);
    hapticCelebrate();
    setAttendanceOpen(false);
    setMemoryNote(activePlan.memoryNote);
    setMemoryPhoto(activePlan.memoryPhotoUri);
    setMemoryOpen(true);
  };

  const onConfirmCancel = async () => {
    setCancelOpen(false);
    await markPlanStatus('cancelled');
  };

  const toggleAttended = (friendId: string) => {
    setAttendedIds((current) => (
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    ));
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

  const styleFriend = styleFriendId
    ? data.friends.find((entry) => entry.id === styleFriendId) ?? null
    : null;

  return (
    <Screen contentClassName="gap-5">
      <ScreenHeader title="Plan" onBack={goBack} />

      <Animated.View style={bloomStyle}>
        <Card elevation="lift" className="gap-3 p-5">
          <Text className="font-sans-semibold text-caption text-muted">
            {formatDayHeading(start)} · {formatClock(startMin, data.settings.timeFormat24h)}
            {' – '}
            {formatClock(endMin, data.settings.timeFormat24h)}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            {planFriends.map((item) => {
              const friend = data.friends.find((entry) => entry.id === item.friendId);
              const name = friend?.name ?? item.displayNameSnapshot ?? 'Friend';
              return (
                <View key={item.friendId} className="flex-row items-center gap-2 rounded-full bg-canvas px-2 py-1">
                  <Avatar name={name} photoUri={friend?.photoUri} size={28} />
                  <Text className="font-sans-semibold text-caption text-ink">{name}</Text>
                </View>
              );
            })}
          </View>
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
          <View className="gap-3">
            <Text className="font-sans-bold text-section text-ink">Invitations</Text>
            {planFriends.map((item) => {
              const friend = data.friends.find((entry) => entry.id === item.friendId);
              if (!friend) {
                return null;
              }
              const draft = inviteDrafts[item.friendId] ?? item.invitationText;
              const isEditing = editingInvite[item.friendId] ?? false;
              const showStatusLabel = LABEL_STATUSES.includes(item.status);

              return (
                <Card key={item.friendId} className="gap-3 p-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="font-sans-bold text-body text-ink">{friend.name}</Text>
                    {showStatusLabel ? (
                      <Text className="text-caption font-sans-semibold text-muted">
                        {INVITE_STATUS_LABELS[item.status]}
                      </Text>
                    ) : null}
                  </View>

                  {isEditing ? (
                    <TextField
                      label="Invitation"
                      value={draft}
                      onChangeText={(text) => {
                        setInviteDrafts((current) => ({ ...current, [item.friendId]: text }));
                      }}
                      onBlur={() => saveInviteText(item.friendId)}
                      multiline
                      className="min-h-[96px]"
                    />
                  ) : (
                    <View className="gap-2">
                      <Text className="text-body text-ink">{draft}</Text>
                      <Button
                        label="Edit message"
                        variant="secondary"
                        onPress={() => setEditingInvite((current) => ({ ...current, [item.friendId]: true }))}
                      />
                    </View>
                  )}

                  <Button
                    label="Change style"
                    variant="ghost"
                    onPress={() => setStyleFriendId(item.friendId)}
                  />

                  <Button
                    label={`Share via ${SHARE_OPTIONS.find((option) => option.value === friend.shareMethod)?.label ?? 'share'} with ${friend.name}`}
                    onPress={() => void onShare(item.friendId, draft)}
                  />

                  <View className="gap-2">
                    <Text className="text-caption font-sans-semibold text-ink">Response</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {RESPONSE_CHOICES.map((choice) => {
                        const selected = item.status === choice.status;
                        return (
                          <Pressable
                            key={choice.status}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={choice.label}
                            onPress={() => onSetStatus(item.friendId, choice.status)}
                            className={cn(
                              'min-h-[36px] items-center justify-center rounded-full border px-3',
                              selected ? 'border-primary bg-primary-soft' : 'border-border bg-canvas',
                            )}
                          >
                            <Text
                              className={cn(
                                'text-center text-caption font-sans-semibold leading-5',
                                selected ? 'text-primary' : 'text-ink',
                              )}
                            >
                              {choice.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!showStatusLabel && !RESPONSE_CHOICES.some((choice) => choice.status === item.status) ? (
                      <Text className="text-caption text-muted">
                        {INVITE_STATUS_LABELS[item.status]}
                      </Text>
                    ) : null}
                  </View>

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

          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: planDetailsOpen }}
              accessibilityLabel="Plan details"
              onPress={() => setPlanDetailsOpen((open) => !open)}
              className="min-h-[44px] flex-row items-center justify-between rounded-control border border-border bg-surface px-4 py-3"
            >
              <Text className="font-sans-semibold text-body text-ink">Plan details</Text>
              <Text className="text-caption text-muted">{planDetailsOpen ? 'Hide' : 'Show'}</Text>
            </Pressable>
            {planDetailsOpen ? (
              <View className="gap-3">
                <TextField label="Title" value={title} onChangeText={setTitle} onBlur={saveDetails} />
                <TextField label="Activity" value={activity} onChangeText={setActivity} onBlur={saveDetails} />
                <TextField label="Place" value={place} onChangeText={setPlace} onBlur={saveDetails} />
                <TextField
                  label="Private note"
                  value={note}
                  onChangeText={setNote}
                  onBlur={saveDetails}
                  placeholder="Just for you"
                />
              </View>
            ) : null}
          </View>
        </>
      )}

      {!isDone && !isCancelled ? (
        <View className="gap-2">
          <Button label="Mark done" onPress={onMarkDonePress} />
          <Button label="Cancel plan" variant="ghost" onPress={() => setCancelOpen(true)} />
        </View>
      ) : null}

      <AnimatedDialog
        visible={styleFriendId !== null}
        onClose={() => setStyleFriendId(null)}
        accessibilityLabel="Change invitation style"
      >
        <View className="gap-1 px-5 pb-4">
          <Text className="mb-2 font-sans-bold text-section text-ink">
            Change style for {styleFriend?.name ?? 'them'}
          </Text>
          {TONE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} tone`}
              onPress={() => {
                if (styleFriendId) {
                  onPickTone(styleFriendId, option.value);
                }
              }}
              className="min-h-[48px] justify-center border-b border-border py-3 active:bg-primary-soft"
            >
              <Text className="text-body text-ink">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={confirmFriendId !== null}
        onClose={() => setConfirmFriendId(null)}
        accessibilityLabel="Confirm invitation sent"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">Did you send it?</Text>
          <Text className="text-body text-muted">
            Android can’t always tell if the message went through. Let us know so we can track
            {' '}
            {confirmFriend?.name ?? 'their'}
            {' '}
            reply.
          </Text>
          <Button
            label="Yes, I sent it"
            onPress={() => {
              if (confirmFriendId) {
                void confirmInviteSent(confirmFriendId, true);
              }
              setConfirmFriendId(null);
            }}
          />
          <Button
            label="Not yet"
            variant="ghost"
            onPress={() => {
              if (confirmFriendId) {
                void confirmInviteSent(confirmFriendId, false);
              }
              setConfirmFriendId(null);
            }}
          />
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        accessibilityLabel="Cancel plan"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">Cancel this plan?</Text>
          <Text className="text-body text-muted">
            This keeps it in your history as cancelled. You can always make a new invitation later.
          </Text>
          <Button label="Cancel plan" variant="ghost" onPress={() => void onConfirmCancel()} />
          <Button label="Keep plan" onPress={() => setCancelOpen(false)} />
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={doneFutureOpen}
        onClose={() => setDoneFutureOpen(false)}
        accessibilityLabel="Mark future plan done"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">Mark done already?</Text>
          <Text className="text-body text-muted">
            This plan is still in the future. Mark it done only if it already happened or won’t happen as planned.
          </Text>
          <Button label="Mark done" onPress={onConfirmDoneFuture} />
          <Button label="Not yet" variant="ghost" onPress={() => setDoneFutureOpen(false)} />
        </View>
      </AnimatedDialog>

      <AnimatedDialog
        visible={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        accessibilityLabel="Who attended"
      >
        <View className="gap-3 px-5 pb-4">
          <Text className="font-sans-bold text-section text-ink">Who made it?</Text>
          <Text className="text-body text-muted">
            We’ll update last-seen for the people you select.
          </Text>
          {planFriends.map((item) => {
            const friend = data.friends.find((entry) => entry.id === item.friendId);
            if (!friend) return null;
            const selected = attendedIds.includes(item.friendId);
            return (
              <Pressable
                key={item.friendId}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={friend.name}
                onPress={() => toggleAttended(item.friendId)}
                className={cn(
                  'min-h-[48px] flex-row items-center gap-3 rounded-control border px-3',
                  selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                )}
              >
                <Avatar name={friend.name} photoUri={friend.photoUri} size={36} />
                <Text className="flex-1 font-sans-semibold text-body text-ink">{friend.name}</Text>
                <View
                  className={cn(
                    'h-5 w-5 items-center justify-center rounded border',
                    selected ? 'border-primary bg-primary' : 'border-border',
                  )}
                >
                  {selected ? <Text className="text-[10px] text-primary-text">✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
          <Button label="Save" onPress={() => void onConfirmAttendance()} />
          <Button label="Cancel" variant="ghost" onPress={() => setAttendanceOpen(false)} />
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
