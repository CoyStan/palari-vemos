import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import type { AvailabilityKind, Recurrence } from '../domain/types';
import { formatDateKey } from '../domain/time';
import { hapticCelebrate, hapticTick } from '../services/haptics';
import { useApp } from '../state/AppProvider';
import { cn } from '../ui/cn';

type Step = 'greet' | 'name' | 'availability' | 'done';

type QuickSlot = {
  id: string;
  label: string;
  hint: string;
  daysOfWeek: number[];
  startMinutes: number;
  endMinutes: number;
};

const QUICK_SLOTS: QuickSlot[] = [
  { id: 'weeknights', label: 'Weeknights', hint: 'Mon–Thu, 7–10 PM', daysOfWeek: [1, 2, 3, 4], startMinutes: 19 * 60, endMinutes: 22 * 60 },
  { id: 'friday', label: 'Friday nights', hint: 'Fridays, 7–11 PM', daysOfWeek: [5], startMinutes: 19 * 60, endMinutes: 23 * 60 },
  { id: 'weekend', label: 'Weekend afternoons', hint: 'Sat & Sun, 2–6 PM', daysOfWeek: [0, 6], startMinutes: 14 * 60, endMinutes: 18 * 60 },
  { id: 'brunch', label: 'Sunday brunch', hint: 'Sundays, 10 AM–1 PM', daysOfWeek: [0], startMinutes: 10 * 60, endMinutes: 13 * 60 },
  { id: 'lunch', label: 'Weekday lunches', hint: 'Mon–Fri, 12–2 PM', daysOfWeek: [1, 2, 3, 4, 5], startMinutes: 12 * 60, endMinutes: 14 * 60 },
];

export function OnboardingScreen() {
  const { completeOnboarding, goWhen } = useApp();
  const [step, setStep] = useState<Step>('greet');
  const [name, setName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>('weeknights');
  const [saving, setSaving] = useState(false);

  const onStartName = () => { hapticTick(); setStep('name'); };
  const onNameNext = () => {
    if (!name.trim()) return;
    hapticTick();
    setStep('availability');
  };
  const onSkipAvailability = () => {
    hapticTick();
    void finish(null);
  };
  const onFinish = () => { void finish(selectedSlot); };

  const finish = async (slotId: string | null) => {
    setSaving(true);
    try {
      const slot = QUICK_SLOTS.find((s) => s.id === slotId);
      const today = formatDateKey(new Date());
      const availability = slot
        ? {
            kind: 'recurring' as AvailabilityKind,
            label: slot.label,
            daysOfWeek: slot.daysOfWeek,
            startMinutes: slot.startMinutes,
            endMinutes: slot.endMinutes,
            recurrence: 'weekly' as Recurrence,
            startDate: today,
            endDate: null,
            oneOffDate: null,
            enabled: true,
          }
        : {
            kind: 'oneoff' as AvailabilityKind,
            label: "You're free",
            daysOfWeek: [],
            startMinutes: 18 * 60,
            endMinutes: 20 * 60,
            recurrence: 'weekly' as Recurrence,
            startDate: today,
            endDate: null,
            oneOffDate: today,
            enabled: true,
          };
      await completeOnboarding(name.trim() || 'Me', availability);
      hapticCelebrate();
      setStep('done');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentClassName="flex-grow justify-center gap-8">
      {step === 'greet' ? (
        <Animated.View entering={FadeInUp.duration(400)} className="gap-6">
          <View className="gap-3">
            <Text className="font-sans-bold text-display tracking-[-1.2px] text-primary">
              So, when?
            </Text>
            <Text className="font-sans-bold text-title tracking-[-0.6px] text-ink">
              Turn "we should catch up" into an actual plan.
            </Text>
            <Text className="text-body text-muted">
              You're the organiser. Friends never need this app — you share
              invites however you already talk to them.
            </Text>
          </View>
          <View className="gap-3 rounded-card bg-primary-soft p-4">
            <Text className="font-sans-bold text-section text-primary">Private by design</Text>
            <Text className="text-body text-muted">
              Everything stays on your phone. No accounts, no uploads.
            </Text>
          </View>
          <Button label="Get started (takes a minute)" onPress={onStartName} />
          <Button label="Skip intro" variant="ghost" onPress={goWhen} />
        </Animated.View>
      ) : null}

      {step === 'name' ? (
        <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
          <Text className="font-sans-bold text-title tracking-[-0.6px] text-ink">
            What do your friends call you?
          </Text>
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={onNameNext}
          />
          <Button label="Next →" onPress={onNameNext} />
        </Animated.View>
      ) : null}

      {step === 'availability' ? (
        <Animated.View entering={FadeInDown.duration(300)} className="gap-5">
          <View className="gap-2">
            <Text className="font-sans-bold text-title tracking-[-0.6px] text-ink">
              When are you usually free?
            </Text>
            <Text className="text-body text-muted">
              Pick the one that fits best — you can add more later.
            </Text>
          </View>
          <View className="gap-2">
            {QUICK_SLOTS.map((slot) => {
              const selected = selectedSlot === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${slot.label}: ${slot.hint}`}
                  onPress={() => { hapticTick(); setSelectedSlot(slot.id); }}
                  className={cn(
                    'min-h-[60px] justify-center rounded-card px-4 py-3',
                    selected ? 'bg-primary' : 'bg-surface border border-border',
                  )}
                >
                  <Text
                    className={cn(
                      'font-sans-bold text-body',
                      selected ? 'text-white' : 'text-ink',
                    )}
                  >
                    {slot.label}
                  </Text>
                  <Text
                    className={cn(
                      'mt-0.5 text-caption',
                      selected ? 'text-white/80' : 'text-muted',
                    )}
                  >
                    {slot.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button
            label={selectedSlot ? "Let's go →" : 'Skip for now'}
            loading={saving}
            onPress={selectedSlot ? onFinish : onSkipAvailability}
          />
        </Animated.View>
      ) : null}

      {step === 'done' ? (
        <Animated.View entering={FadeInUp.duration(400)} className="gap-6">
          <Text className="font-sans-bold text-display tracking-[-1.2px] text-primary">
            You're in.
          </Text>
          <Text className="font-sans-bold text-title tracking-[-0.6px] text-ink">
            Add a friend, tap a free slot, share the invite.
            That's it.
          </Text>
          <Button label="Open the app" onPress={goWhen} />
        </Animated.View>
      ) : null}
    </Screen>
  );
}
