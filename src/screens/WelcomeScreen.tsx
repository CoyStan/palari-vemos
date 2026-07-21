import { Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { useApp } from '../state/AppProvider';

export function WelcomeScreen() {
  const { openAddFriend, openOnboarding, loadError, retryLoad, goWhen } = useApp();

  return (
    <Screen contentClassName="flex-grow justify-center gap-6">
      <View className="gap-3">
        <Text className="font-sans-bold text-display tracking-[-1.2px] text-primary">
          So, when?
        </Text>
        <Text className="font-sans-bold text-title tracking-[-0.6px] text-ink">
          Turn “we should catch up” into an actual plan.
        </Text>
        <Text className="text-body text-muted">
          Add friends, mark when you’re free, invite them with the apps you
          already use. Friends never need this app.
        </Text>
      </View>

      <Card className="gap-2">
        <Text className="font-sans-bold text-section text-ink">Private by design</Text>
        <Text className="text-body text-muted">
          Everything stays on your phone. No accounts, no uploads, no server.
        </Text>
      </Card>

      {loadError ? (
        <View className="gap-3 rounded-card bg-coral-soft p-4">
          <Text className="text-body text-ink">{loadError}</Text>
          <Button label="Try again" variant="secondary" onPress={() => void retryLoad()} />
        </View>
      ) : null}

      <Button label="Get started" onPress={openOnboarding} />
      <Button label="Skip intro" variant="ghost" onPress={goWhen} />
    </Screen>
  );
}
