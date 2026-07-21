import { Alert, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  catchUpLabel,
  catchUpStatus,
  lastMetLabel,
  PLAN_STATUS_LABELS,
  RHYTHM_OPTIONS,
  SHARE_OPTIONS,
} from '../domain/model';
import { formatDayHeading } from '../domain/time';
import { useApp } from '../state/AppProvider';
import { cn } from '../ui/cn';

export function FriendProfileScreen() {
  const {
    activeFriend,
    data,
    openEditFriend,
    openPlanDetail,
    deleteFriend,
    goBack,
  } = useApp();

  if (!activeFriend) {
    return (
      <Screen>
        <ScreenHeader title="Friend" onBack={goBack} />
        <Text className="text-body text-muted">Friend not found.</Text>
      </Screen>
    );
  }

  const friend = activeFriend;
  const rhythm = RHYTHM_OPTIONS.find((option) => option.value === friend.rhythm)?.label ?? 'No schedule';
  const share = SHARE_OPTIONS.find((option) => option.value === friend.shareMethod)?.label ?? 'Other';
  const upcoming = data.plans.filter((plan) => (
    plan.status !== 'done'
    && plan.status !== 'cancelled'
    && plan.friends.some((item) => item.friendId === friend.id && item.status !== 'moved')
    && new Date(plan.startAt).getTime() >= Date.now()
  ));
  const previous = data.plans.filter((plan) => (
    (plan.status === 'done' || new Date(plan.startAt).getTime() < Date.now())
    && plan.friends.some((item) => item.friendId === friend.id)
  )).slice(0, 5);

  const onDelete = () => {
    Alert.alert(
      `Remove ${friend.name}?`,
      'This only removes them from So, When? on this phone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deleteFriend(friend.id);
          },
        },
      ],
    );
  };

  return (
    <Screen contentClassName="gap-5">
      <ScreenHeader title={friend.name} onBack={goBack} />

      <View className="items-center gap-2 py-2">
        <Avatar name={friend.name} photoUri={friend.photoUri} size={96} />
        <Text className="font-sans-bold text-title text-ink">{friend.name}</Text>
        <Text className="text-body text-muted">{lastMetLabel(friend.lastMetAt)}</Text>
        <View
          className={cn(
            'mt-1 rounded-full px-3 py-1',
            catchUpStatus(friend) === 'due' && 'bg-coral-soft',
            catchUpStatus(friend) === 'soon' && 'bg-primary-soft',
            catchUpStatus(friend) === 'none' && 'bg-canvas',
          )}
        >
          <Text
            className={cn(
              'text-caption font-sans-semibold',
              catchUpStatus(friend) === 'due' && 'text-coral-deep',
              catchUpStatus(friend) === 'soon' && 'text-primary',
              catchUpStatus(friend) === 'none' && 'text-muted',
            )}
          >
            {catchUpLabel(catchUpStatus(friend), friend)}
          </Text>
        </View>
      </View>

      <Card className="gap-1 p-5">
        <Row label="Catch-up rhythm" value={rhythm} />
        {friend.phone ? <Row label="Phone" value={friend.phone} /> : null}
        <Row label="Share via" value={share} />
      </Card>

      {upcoming.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans-bold text-section text-ink">Coming up</Text>
          {upcoming.map((plan) => (
            <Button
              key={plan.id}
              label={`${plan.title} · ${PLAN_STATUS_LABELS[plan.status]}`}
              variant="secondary"
              onPress={() => openPlanDetail(plan.id)}
            />
          ))}
        </View>
      ) : null}

      {previous.length > 0 ? (
        <View className="gap-2">
          <Text className="font-sans-bold text-section text-ink">Good times</Text>
          {previous.map((plan) => (
            <Card key={plan.id} className="px-4 py-3">
              <Text className="font-sans-semibold text-body text-ink">{plan.title}</Text>
              <Text className="text-caption text-muted">
                {formatDayHeading(new Date(plan.startAt))} · {PLAN_STATUS_LABELS[plan.status]}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      <Button label="Edit" onPress={() => openEditFriend(friend.id)} />
      <Button label="Remove friend" variant="ghost" onPress={onDelete} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5 py-1">
      <Text className="text-caption text-muted">{label}</Text>
      <Text className="text-body text-ink">{value}</Text>
    </View>
  );
}
