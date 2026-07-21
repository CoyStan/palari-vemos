import { Image, Text, View } from "react-native";

import { cn } from "../ui/cn";

type Props = {
  name: string;
  photoUri?: string | null;
  size?: number;
};

const PALETTES = [
  "bg-primary-soft text-primary",
  "bg-coral-soft text-coral-deep",
  "bg-success-soft text-success",
  "bg-[#F6EEDC] text-[#8A6D3B]",
  "bg-[#ECE9F6] text-[#5B5680]",
];

export function Avatar({ name, photoUri, size = 48 }: Props) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const palette =
    PALETTES[name.trim().length % PALETTES.length] ?? PALETTES[0]!;
  const [bg, fg] = palette.split(" ");

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        accessibilityLabel={`${name} photo`}
        className="rounded-full bg-border"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={`${name} avatar`}
      className={cn("items-center justify-center", bg)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text
        className={cn("font-sans-bold", fg)}
        style={{ fontSize: size * 0.4 }}
      >
        {initial}
      </Text>
    </View>
  );
}
