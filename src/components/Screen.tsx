import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '../ui/cn';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
};

export function Screen({
  children,
  scroll = true,
  className,
  contentClassName,
}: Props) {
  const body = scroll ? (
    <ScrollView
      contentContainerClassName={cn('px-6 pb-10 pt-6', contentClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 px-6 pb-10 pt-6', contentClassName)}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      className={cn('flex-1 bg-canvas font-sans', className)}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
