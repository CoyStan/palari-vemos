import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { ChoiceRow } from "../components/ChoiceRow";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import { RHYTHM_OPTIONS, SHARE_OPTIONS } from "../domain/model";
import type { CatchUpRhythm, ShareMethod } from "../domain/types";
import { copyIntoOwnedMedia } from "../services/media";
import { useApp } from "../state/AppProvider";

type Props = {
  mode: "create" | "edit";
};

export function FriendFormScreen({ mode }: Props) {
  const {
    activeFriend,
    saveFriend,
    deleteFriend,
    getFriendDeletionImpact,
    goBack,
  } = useApp();

  const existing = mode === "edit" ? activeFriend : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [photoUri, setPhotoUri] = useState<string | null>(
    existing?.photoUri ?? null,
  );
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [shareMethod, setShareMethod] = useState<ShareMethod>(
    existing?.shareMethod ?? "whatsapp",
  );
  const [rhythm, setRhythm] = useState<CatchUpRhythm>(
    existing?.rhythm ?? "monthly",
  );
  const [customDays, setCustomDays] = useState(
    String(existing?.customDays ?? 45),
  );
  const [saving, setSaving] = useState(false);

  const rhythmOptions = useMemo(
    () =>
      RHYTHM_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [],
  );

  const ownPhoto = async (
    sourceUri: string | null | undefined,
    kind: "friend",
    mimeType?: string | null,
  ): Promise<string | null> => {
    if (!sourceUri) return null;
    const copied = await copyIntoOwnedMedia(sourceUri, kind, mimeType);
    if (!copied.ok) {
      Alert.alert("Photo not saved", copied.message);
      return null;
    }
    return copied.uri;
  };

  const onPickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const owned = await ownPhoto(
        result.assets[0].uri,
        "friend",
        result.assets[0].mimeType,
      );
      if (owned) {
        setPhotoUri(owned);
      }
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert("Add a name", "A first name or nickname is enough.");
      return;
    }
    setSaving(true);
    try {
      await saveFriend(
        {
          name,
          photoUri,
          phone,
          shareMethod,
          rhythm,
          customDays: Number.parseInt(customDays, 10) || 45,
          lastMetAt: existing?.lastMetAt ?? null,
        },
        existing?.id,
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!existing) {
      return;
    }
    const affected = getFriendDeletionImpact(existing.id);
    const warning =
      affected.length > 0
        ? ` ${
            affected.length === 1
              ? "1 upcoming plan"
              : `${affected.length} upcoming plans`
          } will be updated — plans where they are the only person will be cancelled.`
        : "";
    Alert.alert(
      `Remove ${existing.name}?`,
      `This only removes them from So, When? on this phone.${warning}`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void deleteFriend(existing.id);
          },
        },
      ],
    );
  };

  return (
    <Screen contentClassName="gap-5">
      <ScreenHeader
        title={mode === "edit" ? "Edit friend" : "Add a friend"}
        onBack={goBack}
      />

      <View className="items-center gap-3">
        <Avatar name={name || "Friend"} photoUri={photoUri} size={72} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photo"
          onPress={() => void onPickPhoto()}
          className="min-h-[44px] items-center justify-center px-3"
        >
          <Text className="text-body font-sans-semibold text-primary">
            {photoUri ? "Change photo" : "Add photo (optional)"}
          </Text>
        </Pressable>
      </View>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Ana"
        autoCapitalize="words"
        autoCorrect={false}
      />

      <TextField
        label="Phone (optional)"
        value={phone}
        onChangeText={setPhone}
        placeholder="+1…"
        keyboardType="phone-pad"
      />

      <ChoiceRow
        label="Preferred sharing"
        options={SHARE_OPTIONS}
        value={shareMethod}
        onChange={setShareMethod}
      />

      <ChoiceRow
        label="Catch-up rhythm"
        options={rhythmOptions}
        value={rhythm}
        onChange={setRhythm}
      />

      {rhythm === "custom" ? (
        <TextField
          label="Every how many days?"
          value={customDays}
          onChangeText={setCustomDays}
          keyboardType="number-pad"
        />
      ) : null}

      <Button
        label={mode === "edit" ? "Save" : "Add friend"}
        loading={saving}
        onPress={() => void onSave()}
      />

      {mode === "edit" && existing ? (
        <Button label="Remove friend" variant="ghost" onPress={onDelete} />
      ) : null}
    </Screen>
  );
}
