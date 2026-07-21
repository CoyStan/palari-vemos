import { Text, View } from "react-native";

import { Card } from "../components/Card";
import { PressableScale } from "../components/PressableScale";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { formatClock, PLAN_STATUS_LABELS } from "../domain/model";
import { formatDayHeading } from "../domain/time";
import { useApp } from "../state/AppProvider";

export function PastPlansScreen() {
  const { data, openPlanDetail, goBack } = useApp();

  const past = [...data.plans]
    .filter((plan) => plan.status === "done" || plan.status === "cancelled")
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  return (
    <Screen contentClassName="gap-4">
      <ScreenHeader title="Past plans" onBack={goBack} />
      <Text className="text-body text-muted">
        Completed and cancelled plans — tap to open.
      </Text>
      {past.length === 0 ? (
        <Card>
          <Text className="text-body text-muted">
            Nothing in the archive yet. Finished plans will show up here.
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {past.map((plan) => {
            const start = new Date(plan.startAt);
            const end = new Date(plan.endAt);
            const startMin = start.getHours() * 60 + start.getMinutes();
            const endMin = end.getHours() * 60 + end.getMinutes();
            return (
              <PressableScale
                key={plan.id}
                accessibilityRole="button"
                accessibilityLabel={`${plan.title}, ${PLAN_STATUS_LABELS[plan.status]}`}
                onPress={() => openPlanDetail(plan.id)}
              >
                <Card className="min-h-[44px] gap-1 px-4 py-3">
                  <Text className="font-sans-semibold text-caption text-muted">
                    {formatDayHeading(start)} ·{" "}
                    {formatClock(startMin, data.settings.timeFormat24h)}
                    {" – "}
                    {formatClock(endMin, data.settings.timeFormat24h)}
                  </Text>
                  <Text className="font-sans-bold text-body text-ink">
                    {plan.title}
                  </Text>
                  <Text className="text-caption text-primary">
                    {PLAN_STATUS_LABELS[plan.status]}
                  </Text>
                </Card>
              </PressableScale>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
