import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space, type } from '../foundation';
import type { TabId } from '../state/AppProvider';

type Props = {
  active: TabId;
  onCalendar: () => void;
  onFriends: () => void;
};

export function BottomNav({ active, onCalendar, onFriends }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <NavItem
        label="Calendar"
        glyph="▦"
        active={active === 'calendar'}
        onPress={onCalendar}
      />
      <NavItem
        label="Friends"
        glyph="◎"
        active={active === 'friends'}
        onPress={onFriends}
      />
    </View>
  );
}

function NavItem({
  label,
  glyph,
  active,
  onPress,
}: {
  label: string;
  glyph: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.glyph, active ? styles.activeText : styles.inactiveText]}>
        {glyph}
      </Text>
      <Text style={[styles.label, active ? styles.activeText : styles.inactiveText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
    paddingTop: space.sm,
  },
  item: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  glyph: {
    fontSize: 18,
    lineHeight: 22,
  },
  label: {
    fontSize: type.caption,
    fontWeight: '600',
  },
  activeText: {
    color: color.primary,
  },
  inactiveText: {
    color: color.muted,
  },
});
