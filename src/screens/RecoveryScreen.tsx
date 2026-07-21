import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { useApp } from '../state/AppProvider';

export function RecoveryScreen() {
  const { loadError, retryLoad, startFresh } = useApp();

  return (
    <SafeAreaView className="flex-1 bg-canvas px-5 pt-10 font-sans">
      <View className="flex-1 justify-center gap-5">
        <Text accessibilityRole="header" className="font-sans-bold text-[28px] tracking-[-1px] text-ink">
          Couldn’t open your data
        </Text>
        <Text className="text-body leading-6 text-muted">
          {loadError
            ?? 'Something went wrong reading the save on this phone. Your last known good copy was not overwritten.'}
        </Text>
        <Button label="Try again" onPress={() => void retryLoad()} />
        <Button
          label="Start fresh"
          variant="ghost"
          onPress={() => void startFresh()}
        />
        <Text className="text-caption text-muted">
          Start fresh permanently clears the unreadable save on this device.
        </Text>
      </View>
    </SafeAreaView>
  );
}
