import './global.css';

import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
  useFonts,
} from '@expo-google-fonts/quicksand';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomNav } from './src/components/BottomNav';
import { MuiPickerProvider } from './src/components/MuiPickerProvider';
import { ScreenTransition } from './src/components/ScreenTransition';
import { color } from './src/foundation';
import { AddAvailabilityScreen } from './src/screens/AddAvailabilityScreen';
import { AvailabilityScreen } from './src/screens/AvailabilityScreen';
import { CreatePlanScreen } from './src/screens/CreatePlanScreen';
import { FriendFormScreen } from './src/screens/FriendFormScreen';
import { FriendProfileScreen } from './src/screens/FriendProfileScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { MoveFriendScreen } from './src/screens/MoveFriendScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PlanDetailScreen } from './src/screens/PlanDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { WhenScreen } from './src/screens/WhenScreen';
import { AppProvider, useApp } from './src/state/AppProvider';

function Root() {
  const { ready, screen, tab, goWhen, goFriends, goSettings } = useApp();

  if (!ready || screen === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={color.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  const showTabs = screen === 'when' || screen === 'friends' || screen === 'settings';

  let content = null;
  switch (screen) {
    case 'welcome':
      content = <WelcomeScreen />;
      break;
    case 'addFriend':
      content = <FriendFormScreen key="create" mode="create" />;
      break;
    case 'editFriend':
      content = <FriendFormScreen key="edit" mode="edit" />;
      break;
    case 'friendProfile':
      content = <FriendProfileScreen />;
      break;
    case 'addAvailability':
      content = <AddAvailabilityScreen />;
      break;
    case 'availability':
      content = <AvailabilityScreen />;
      break;
    case 'onboarding':
      content = <OnboardingScreen />;
      break;
    case 'createPlan':
      content = <CreatePlanScreen />;
      break;
    case 'planDetail':
      content = <PlanDetailScreen />;
      break;
    case 'moveFriend':
      content = <MoveFriendScreen />;
      break;
    case 'friends':
      content = <FriendsScreen />;
      break;
    case 'settings':
      content = <SettingsScreen />;
      break;
    case 'when':
    default:
      content = <WhenScreen />;
      break;
  }

  return (
    <View className="flex-1 bg-canvas font-sans">
      <View className="flex-1">
        <ScreenTransition screenKey={screen}>{content}</ScreenTransition>
      </View>
      {showTabs ? (
        <BottomNav
          active={tab}
          onWhen={goWhen}
          onFriends={goFriends}
          onSettings={goSettings}
        />
      ) : null}
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={color.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <MuiPickerProvider>
        <AppProvider>
          <Root />
        </AppProvider>
      </MuiPickerProvider>
    </SafeAreaProvider>
  );
}
