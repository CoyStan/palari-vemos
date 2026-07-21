import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../components/ScreenHeader';
import {
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_SECTIONS,
} from '../content/privacyPolicy';
import { useApp } from '../state/AppProvider';

export function PrivacyPolicyScreen() {
  const { goBack } = useApp();

  return (
    <SafeAreaView className="flex-1 bg-canvas font-sans" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-10 pt-3"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Privacy policy" onBack={goBack} />
        <View className="gap-1">
          <Text className="font-sans-bold text-title text-ink">So, When?</Text>
          <Text className="text-caption text-muted">
            Effective {PRIVACY_POLICY_EFFECTIVE_DATE} · Palari Labs, Inc.
          </Text>
        </View>
        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <View key={section.title} className="gap-2">
            <Text className="font-sans-semibold text-section text-ink">{section.title}</Text>
            <Text className="text-body leading-6 text-muted">{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
