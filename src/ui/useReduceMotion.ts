import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Shared reduce-motion flag for all animation primitives
 * (PressableScale, ScreenTransition, AnimatedDialog).
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) {
        setReduceMotion(enabled);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
