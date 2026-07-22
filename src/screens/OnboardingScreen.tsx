import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import type { AvailabilityKind, Recurrence } from "../domain/types";
import { formatDateKey } from "../domain/time";
import { pickOneContact } from "../services/contacts";
import { copyIntoOwnedMedia } from "../services/media";
import { hapticTick } from "../services/haptics";
import {
  useApp,
  type AvailabilityInput,
  type FriendInput,
} from "../state/AppProvider";
import { cn } from "../ui/cn";

type QuickSlot = {
  id: string;
  label: string;
  hint: string;
  kind: AvailabilityKind;
  daysOfWeek: number[];
  startMinutes: number;
  endMinutes: number;
};

const QUICK_SLOTS: QuickSlot[] = [
  {
    id: "weeknights",
    label: "Weeknights",
    hint: "Mon–Thu, 7–10 PM",
    kind: "recurring",
    daysOfWeek: [1, 2, 3, 4],
    startMinutes: 19 * 60,
    endMinutes: 22 * 60,
  },
  {
    id: "friday",
    label: "Friday nights",
    hint: "Fridays, 7–11 PM",
    kind: "recurring",
    daysOfWeek: [5],
    startMinutes: 19 * 60,
    endMinutes: 23 * 60,
  },
  {
    id: "weekend",
    label: "Weekend afternoons",
    hint: "Sat & Sun, 2–6 PM",
    kind: "recurring",
    daysOfWeek: [0, 6],
    startMinutes: 14 * 60,
    endMinutes: 18 * 60,
  },
  {
    id: "oneoff",
    label: "One evening this week",
    hint: "Tomorrow, 7–9 PM",
    kind: "oneoff",
    daysOfWeek: [],
    startMinutes: 19 * 60,
    endMinutes: 21 * 60,
  },
];

function defaultFriend(
  name: string,
  phone = "",
  photoUri: string | null = null,
): FriendInput {
  return {
    name,
    photoUri,
    phone,
    shareMethod: "message",
    rhythm: "monthly",
    customDays: 45,
    lastMetAt: null,
  };
}

export function OnboardingScreen() {
  const { completeOnboarding, goBack } = useApp();
  const [step, setStep] = useState<"friend" | "availability">("friend");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>("weeknights");
  const [saving, setSaving] = useState(false);

  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateKey(d);
  }, []);

  const onPickContact = () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Contacts",
        "Contact picking works on Android and iOS. You can still type a name.",
      );
      return;
    }
    Alert.alert(
      "Choose one contact",
      "So, When? opens your contact picker to fill in a name and optional phone or photo for this friend only. Contacts are never scanned or uploaded. You can always type a name instead.",
      [
        { text: "Type instead", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            void (async () => {
              const result = await pickOneContact();
              if (!result.ok) {
                if (result.reason === "cancelled") {
                  return;
                }
                Alert.alert("Contacts", result.message);
                return;
              }
              setName(result.contact.name);
              setPhone(result.contact.phone ?? "");
              if (result.contact.photoUri) {
                const owned = await copyIntoOwnedMedia(
                  result.contact.photoUri,
                  "contact",
                );
                if (owned.ok) {
                  setPhotoUri(owned.uri);
                }
              }
            })();
          },
        },
      ],
    );
  };

  const finish = async (availability: AvailabilityInput | null) => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await completeOnboarding({
        friend: defaultFriend(name, phone, photoUri),
        availability,
      });
    } finally {
      setSaving(false);
    }
  };

  const buildAvailability = (
    slotId: string | null,
  ): AvailabilityInput | null => {
    if (!slotId) return null;
    const slot = QUICK_SLOTS.find((item) => item.id === slotId);
    if (!slot) return null;
    const today = formatDateKey(new Date());
    return {
      kind: slot.kind,
      label: slot.label,
      daysOfWeek: slot.daysOfWeek,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      recurrence: "weekly" as Recurrence,
      startDate: today,
      endDate: null,
      oneOffDate: slot.kind === "oneoff" ? tomorrowKey : null,
      enabled: true,
    };
  };

  if (step === "friend") {
    return (
      <Screen contentClassName="gap-4">
        <ScreenHeader title="Get started" onBack={goBack} />
        <Text
          accessibilityRole="header"
          className="font-sans-bold text-title text-ink"
        >
          Who would you like to see?
        </Text>
        <Text className="text-body text-muted">
          A name is enough. You can add a number or photo later.
        </Text>
        <Button
          label="Choose one contact"
          variant="secondary"
          onPress={() => onPickContact()}
        />
        <TextField
          label="Friend’s name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          accessibilityLabel="Friend’s name"
          accessibilityHint="Type a name if you prefer not to use contacts"
        />
        <Text className="text-caption text-muted">
          Prefer typing? Use the name field — contacts are optional.
        </Text>
        <Button
          label="Continue"
          disabled={!name.trim()}
          onPress={() => {
            hapticTick();
            setStep("availability");
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-4">
      <ScreenHeader title="Availability" onBack={() => setStep("friend")} />
      <Text
        accessibilityRole="header"
        className="font-sans-bold text-title text-ink"
      >
        When are you usually free?
      </Text>
      <Text className="text-body text-muted">
        Choose one preset. You can add more later.
      </Text>
      <View className="gap-2">
        {QUICK_SLOTS.map((slot) => {
          const selected = selectedSlot === slot.id;
          return (
            <Pressable
              key={slot.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                hapticTick();
                setSelectedSlot(slot.id);
              }}
              className={cn(
                "min-h-[48px] rounded-card border px-4 py-3",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-surface",
              )}
            >
              <Text className="font-sans-semibold text-body text-ink">
                {slot.label}
              </Text>
              <Text className="text-caption text-muted">{slot.hint}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Finish"
        disabled={saving || !selectedSlot}
        onPress={() => void finish(buildAvailability(selectedSlot))}
      />
      <Button
        label="Skip for now"
        variant="ghost"
        disabled={saving}
        onPress={() => void finish(null)}
      />
    </Screen>
  );
}
