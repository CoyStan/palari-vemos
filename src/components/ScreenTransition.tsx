import { useEffect, type ReactNode } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "../ui/useReduceMotion";

/** Matches AppProvider stack motion. */
export type NavMotion = "none" | "push" | "pop" | "replace";

const PUSH_MS = 240;
const POP_MS = 200;
const REPLACE_MS = 180;
/** Shared-axis distance — enough to read as forward/back, not a full-page swipe. */
const SLIDE_PX = 28;

type Props = {
  /** Changes when the active screen changes; retriggers the enter animation. */
  screenKey: string;
  children: ReactNode;
  /**
   * none — tabs / reset (instant)
   * push — forward into a detail (from right)
   * pop — back (from left)
   * replace — same depth swap (fade only)
   */
  motion?: NavMotion;
};

/**
 * Navigation enter motion following common mobile practice:
 * - Tab peers: none
 * - Push/pop: short horizontal shared-axis + fade
 * - Replace: fade only
 * Reduce-motion → instant.
 */
export function ScreenTransition({
  screenKey,
  children,
  motion = "push",
}: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(1);
  const slideSign = useSharedValue(1);

  useEffect(() => {
    if (motion === "none" || reduceMotion) {
      slideSign.value = 0;
      progress.value = 1;
      return;
    }

    slideSign.value = motion === "push" ? 1 : motion === "pop" ? -1 : 0;
    const duration =
      motion === "push" ? PUSH_MS : motion === "pop" ? POP_MS : REPLACE_MS;

    progress.value = 0;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenKey, motion, reduceMotion, progress, slideSign]);

  const animatedStyle = useAnimatedStyle(() => {
    const sign = slideSign.value;
    return {
      opacity: progress.value,
      transform: [
        {
          translateX: sign === 0 ? 0 : (1 - progress.value) * SLIDE_PX * sign,
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
