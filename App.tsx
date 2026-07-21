import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomNav } from './src/components/BottomNav';
import { color } from './src/foundation';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { FreeTimesScreen } from './src/screens/FreeTimesScreen';
import { FriendFormScreen } from './src/screens/FriendFormScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { InviteDetailScreen } from './src/screens/InviteDetailScreen';
import { MoveInviteScreen } from './src/screens/MoveInviteScreen';
import { PickFriendScreen } from './src/screens/PickFriendScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AppProvider, useApp } from './src/state/AppProvider';

function Root() {
  const {
    ready,
    screen,
    tab,
    editingFriendId,
    goCalendar,
    goFriends,
  } = useApp();

  if (!ready || screen === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={color.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  const showTabs = screen === 'calendar' || screen === 'friends';

  let content = null;
  switch (screen) {
    case 'welcome':
      content = <WelcomeScreen />;
      break;
    case 'addFriend':
      content = <FriendFormScreen key="create" mode="create" />;
      break;
    case 'editFriend':
      content = <FriendFormScreen key={editingFriendId ?? 'edit'} mode="edit" />;
      break;
    case 'freeTimes':
      content = <FreeTimesScreen />;
      break;
    case 'pickFriend':
      content = <PickFriendScreen />;
      break;
    case 'inviteDetail':
      content = <InviteDetailScreen />;
      break;
    case 'moveInvite':
      content = <MoveInviteScreen />;
      break;
    case 'friends':
      content = <FriendsScreen />;
      break;
    case 'calendar':
    default:
      content = <CalendarScreen />;
      break;
  }

  return (
    <View style={styles.root}>
      <View style={styles.main}>{content}</View>
      {showTabs ? (
        <BottomNav
          active={tab}
          onCalendar={goCalendar}
          onFriends={goFriends}
        />
      ) : null}
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  main: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.canvas,
  },
});
