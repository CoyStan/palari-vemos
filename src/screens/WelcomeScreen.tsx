import { Text, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useApp } from "../state/AppProvider";

export function WelcomeScreen() {
  const { openOnboarding, skipOnboardingExplore } = useApp();

  return (
    <Screen contentClassName="flex-grow justify-center gap-6">
      <View className="gap-3">
        <Text
          accessibilityRole="header"
          className="font-sans-bold text-display tracking-[-1.2px] text-primary"
        >
          So, When?
        </Text>
        <Text className="font-sans-bold text-title tracking-[-0.6px] text-ink">
          Turn “we should catch up” into an actual plan.
        </Text>
        <Text className="text-body text-muted">
          Pick a free time, pick someone, share the invitation. Friends never
          need this app.
        </Text>
      </View>

      <Card className="gap-2">
        <Text
          accessibilityRole="header"
          className="font-sans-bold text-section text-ink"
        >
          Private by design
        </Text>
        <Text className="text-body text-muted">
          Everything stays on your phone. No accounts, no uploads, no server.
        </Text>
      </Card>

      <Button label="Get started" onPress={openOnboarding} />
      <Button
        label="Look around first"
        variant="ghost"
        onPress={() => void skipOnboardingExplore()}
      />
    </Screen>
  );
}
