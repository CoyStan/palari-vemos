import { Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PressableScale } from '../components/PressableScale';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { formatClock } from '../domain/model';
import { formatDayHeading } from '../domain/time';
import { useApp } from '../state/AppProvider';

export function MoveFriendScreen() {
  const {
    moveFriendId,
    data,
    slots,
    moveFriendToSlot,
    openAddAvailability,
    goBack,
  } = useApp();

  const friend = data.friends.find((item) => item.id === moveFriendId);

  return (
    <Screen contentClassName="gap-4">
      <ScreenHeader
        title={friend ? `Move ${friend.name}` : 'Move friend'}
        onBack={goBack}
      />
      <Text className="text-body text-muted">
        Pick another free time — or add a new one first.
      </Text>

      <Button label="Add a new free time" variant="secondary" onPress={openAddAvailability} />

      <View className="gap-2">
        {slots.length === 0 ? (
          <Card>
            <Text className="text-body text-muted">No free times in the next three weeks.</Text>
          </Card>
        ) : (
          slots.map((slot) => {
            const start = new Date(slot.startAt);
            return (
              <PressableScale
                key={slot.key}
                accessibilityRole="button"
                accessibilityLabel={`${formatDayHeading(start)}, ${formatClock(slot.startMinutes, data.settings.timeFormat24h)}`}
                onPress={() => void moveFriendToSlot(slot)}
              >
                <Card className="px-4 py-3">
                  <Text className="font-sans-semibold text-body text-ink">
                    {formatDayHeading(start)}
                  </Text>
                  <Text className="text-caption text-primary">
                    {formatClock(slot.startMinutes, data.settings.timeFormat24h)}
                    {' – '}
                    {formatClock(slot.endMinutes, data.settings.timeFormat24h)}
                  </Text>
                </Card>
              </PressableScale>
            );
          })
        )}
      </View>
    </Screen>
  );
}
