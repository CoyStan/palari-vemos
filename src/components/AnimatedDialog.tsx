import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { color, radius } from '../foundation';
import { useReduceMotion } from '../ui/useReduceMotion';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after the close animation finishes. */
  onExited?: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  closeLabel?: string;
};

const OPEN_MS = 250;
const CLOSE_MS = 150;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Dialog motion from ui-skills (micro-interaction + transitions-dev modal):
 * opacity + transform only, asymmetric open/close, reduced-motion aware.
 */
export function AnimatedDialog({
  visible,
  onClose,
  onExited,
  children,
  accessibilityLabel = 'Dialog',
  closeLabel = 'Close',
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const reduceMotion = useReduceMotion();
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    const finishClose = () => {
      setMounted(false);
      onExitedRef.current?.();
    };

    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: reduceMotion ? 1 : OPEN_MS,
        easing: EASE,
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: reduceMotion ? 1 : CLOSE_MS,
        easing: Easing.in(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)();
        }
      },
    );
  }, [progress, reduceMotion, visible]);

  useEffect(() => {
    if (!mounted) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [mounted, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.52,
  }));

  const sheetStyle = useAnimatedStyle(() => {
    const scale = 0.96 + progress.value * 0.04;
    const translateY = (1 - progress.value) * 16;
    return {
      opacity: progress.value,
      transform: reduceMotion
        ? [{ translateY: 0 }, { scale: 1 }]
        : [{ translateY }, { scale }],
    };
  });

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          className="absolute inset-0"
          onPress={onClose}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: color.ink },
              backdropStyle,
            ]}
          />
        </Pressable>

        <Animated.View
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              marginHorizontal: 12,
              marginBottom: 12,
              overflow: 'hidden',
              borderRadius: radius.sheet,
              borderWidth: 1,
              borderColor: color.border,
              backgroundColor: color.surface,
              maxHeight: height * 0.82,
              paddingBottom: Math.max(insets.bottom, 12),
            },
            sheetStyle,
          ]}
        >
          <View className="relative items-center px-4 py-2">
            <View className="h-1 w-10 rounded-full bg-border" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={onClose}
              hitSlop={8}
              className="absolute right-4 min-h-[44px] min-w-[44px] flex-row items-center justify-center gap-1 rounded-full active:bg-primary-soft"
            >
              <Icon name="x" size={18} color={color.muted} accessibilityLabel="" />
              <Text className="font-sans-semibold text-caption text-muted">{closeLabel}</Text>
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
