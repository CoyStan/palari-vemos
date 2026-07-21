import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PressableScale } from "../components/PressableScale";
import { catchUpLabel, catchUpStatus, lastMetLabel } from "../domain/model";
import { pickOneContact } from "../services/contacts";
import { copyIntoOwnedMedia } from "../services/media";
import { useApp } from "../state/AppProvider";
import { cn } from "../ui/cn";

export function FriendsScreen() {
  const { data, openAddFriend, openFriendProfile, saveFriend } = useApp();

  const onPickContact = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Contacts",
        "Contact picking works on Android and iOS. You can still add manually.",
      );
      openAddFriend();
      return;
    }
    try {
      const picked = await pickOneContact();
      if (!picked) {
        return;
      }
      let photoUri: string | null = null;
      if (picked.photoUri) {
        const owned = await copyIntoOwnedMedia(picked.photoUri, "contact");
        if (!owned.ok) {
          Alert.alert("Photo not saved", owned.message);
        } else {
          photoUri = owned.uri;
        }
      }
      await saveFriend({
        name: picked.name,
        photoUri,
        phone: picked.phone,
        shareMethod: "whatsapp",
        rhythm: "monthly",
        customDays: 45,
        lastMetAt: null,
      });
    } catch {
      Alert.alert(
        "Could not open contacts",
        "You can still add a friend manually.",
      );
      openAddFriend();
    }
  };

  const onAddFriend = () => {
    Alert.alert(
      "Add a friend",
      "We only copy the one contact you pick. Everything stays on your phone.",
      [
        { text: "Add manually", onPress: openAddFriend },
        { text: "Choose from contacts", onPress: () => void onPickContact() },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas font-sans"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1 px-5 pt-4">
        <View className="mb-4 gap-1">
          <Text className="font-sans-bold text-[28px] tracking-[-1px] text-ink">
            Friends
          </Text>
          <Text className="text-caption text-muted">
            The people worth making time for
          </Text>
        </View>

        <View className="mb-4">
          <Button label="Add friend" onPress={onAddFriend} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-3 pb-6"
        >
          {data.friends.length === 0 ? (
            <Card className="items-center gap-3 py-8">
              <View className="h-14 flex-row items-center">
                <View className="h-12 w-12 rounded-full bg-primary-soft" />
                <View className="-ml-4 h-14 w-14 rounded-full bg-coral-soft" />
                <View className="-ml-4 h-12 w-12 rounded-full bg-[#F6EEDC]" />
              </View>
              <Text className="font-sans-bold text-section text-ink">
                No friends yet
              </Text>
              <Text className="text-center text-body text-muted">
                Add someone you’d like to see more often. A name is enough —
                phone and rhythm can wait.
              </Text>
            </Card>
          ) : (
            data.friends
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((friend) => {
                const status = catchUpStatus(friend);
                const nextPlan = data.plans.find(
                  (plan) =>
                    plan.status !== "done" &&
                    plan.status !== "cancelled" &&
                    plan.friends.some(
                      (item) =>
                        item.friendId === friend.id && item.status !== "moved",
                    ) &&
                    new Date(plan.startAt).getTime() >= Date.now(),
                );

                return (
                  <PressableScale
                    key={friend.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${friend.name}, ${catchUpLabel(status, friend)}`}
                    onPress={() => openFriendProfile(friend.id)}
                  >
                    <Card className="flex-row items-center gap-3 p-4">
                      <Avatar
                        name={friend.name}
                        photoUri={friend.photoUri}
                        size={52}
                      />
                      <View className="flex-1 gap-0.5">
                        <Text className="font-sans-bold text-body text-ink">
                          {friend.name}
                        </Text>
                        <Text className="text-caption text-muted">
                          {lastMetLabel(friend.lastMetAt)}
                        </Text>
                        {nextPlan ? (
                          <Text className="text-caption text-primary">
                            Next: {nextPlan.title}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        className={cn(
                          "items-center justify-center rounded-full px-3 py-1.5",
                          status === "due" && "bg-coral-soft",
                          status === "soon" && "bg-primary-soft",
                          status === "none" && "bg-canvas",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-center text-caption font-sans-semibold leading-5",
                            status === "due" && "text-coral-deep",
                            status === "soon" && "text-primary",
                            status === "none" && "text-muted",
                          )}
                        >
                          {catchUpLabel(status, friend)}
                        </Text>
                      </View>
                    </Card>
                  </PressableScale>
                );
              })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
