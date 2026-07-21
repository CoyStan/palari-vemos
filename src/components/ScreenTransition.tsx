import { useEffect, type ReactNode } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "../ui/useReduceMotion";

const ENTER_MS = 220;

type Props = {
  /** Changes when the active screen changes; retriggers the enter animation. */
  screenKey: string;
  children: ReactNode;
};

/**
 * Calm screen entry: fade + 12px rise, 220ms, opacity + transform only.
 * Reduce-motion → effectively instant (design-system/vemos motion rules).
 */
export function ScreenTransition({ screenKey, children }: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = reduceMotion ? 1 : 0;
    progress.value = withTiming(1, {
      duration: reduceMotion ? 1 : ENTER_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenKey, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
