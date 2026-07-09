import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SpendGoalHabit, StreakStat } from "@rabbit/application";
import { Confetti } from "../src/components/anim";
import { Card, PageHeader, Pill, ProgressBar, Row, SectionLabel, SkeletonHero, SkeletonList, Tico } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { useTheme } from "../src/theme/ThemeProvider";
import { space, type Palette } from "../src/theme/tokens";

function plural(n: number, one: string) {
  return `${n} ${one}${n === 1 ? "" : "s"}`;
}

/** Streak lengths worth celebrating with a confetti burst. */
const MILESTONES = new Set([3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365]);

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);

  const { data, isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: () => c.queries.habits.execute(c.userId),
  });

  const [celebrate, setCelebrate] = useState(false);
  const celebrated = useRef(false);
  useEffect(() => {
    if (data && !celebrated.current && MILESTONES.has(data.logging.current)) {
      celebrated.current = true;
      setCelebrate(true);
    }
  }, [data]);

  return (
    <View style={s.screen}>
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6) }}
    >
      <PageHeader eyebrow="Your money routine" title="Habits" topInset={insets.top} />

      {isLoading || !data ? (
        <View style={{ gap: space(3) }}>
          <SkeletonHero />
          <SkeletonList rows={3} />
        </View>
      ) : (
        <>
          {/* Logging streak — the headline habit. */}
          <Card hero>
            <Row between>
              <Row style={{ gap: space(3) }}>
                <Tico icon="flame" color={t.gold} size={46} />
                <View>
                  <Text style={s.big}>{data.logging.current}</Text>
                  <Text style={s.bigSub}>day logging streak</Text>
                </View>
              </Row>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Pill tone={data.logging.loggedToday ? "positive" : "gold"}>
                  {data.logging.loggedToday ? "Logged today" : "Log today"}
                </Pill>
                <Text style={s.best}>Best {plural(data.logging.best, "day")}</Text>
              </View>
            </Row>
          </Card>

          <SectionLabel>Streaks</SectionLabel>
          <View style={{ gap: space(2.5), marginTop: space(2.5) }}>
            <StreakRow
              icon="trending-up"
              title="Saving"
              stat={data.savings}
              unit="month"
              caption={
                data.savings.onTrack
                  ? "On track this month"
                  : `${data.savings.thisMonthNet.format({ withCode: false })} net so far`
              }
              onCaption={data.savings.onTrack}
              t={t}
            />
            {data.budget.hasBudget ? (
              <StreakRow
                icon="shield-checkmark"
                title="Under budget"
                stat={data.budget}
                unit="month"
                caption={data.budget.thisMonthUnder ? "Under budget so far" : "Over budget so far"}
                onCaption={data.budget.thisMonthUnder}
                t={t}
              />
            ) : null}
          </View>

          <SectionLabel style={{ marginTop: space(5) }}>Spend goals</SectionLabel>
          {data.goals.length === 0 ? (
            <Card style={{ marginTop: space(2.5) }}>
              <Text style={s.emptyTitle}>No goals yet</Text>
              <Text style={s.emptySub}>Set a budget on a category and it becomes a monthly goal you can keep a streak on.</Text>
            </Card>
          ) : (
            <Card style={{ paddingVertical: space(1), marginTop: space(2.5) }}>
              {data.goals.map((g, i) => (
                <View key={g.categoryId} style={[s.goal, i < data.goals.length - 1 && s.border]}>
                  <Row between>
                    <Row style={{ gap: space(2.5), flex: 1 }}>
                      <View style={[s.swatch, { backgroundColor: g.categoryColor }]} />
                      <Text style={s.goalName} numberOfLines={1}>{g.categoryName}</Text>
                    </Row>
                    {g.current > 0 ? (
                      <Row style={{ gap: 4 }}>
                        <Ionicons name="flame" size={13} color={t.gold} />
                        <Text style={s.goalStreak}>{plural(g.current, "mo")}</Text>
                      </Row>
                    ) : null}
                  </Row>
                  <GoalBar spent={g.spent.minor} target={g.target.minor} />
                  <Row between style={{ marginTop: 6 }}>
                    <Text style={[s.goalMeta, { color: g.onTrack ? t.positive : t.negative }]}>
                      {g.spent.format({ withCode: false })} spent
                    </Text>
                    <Text style={s.goalMeta}>of {g.target.format({ withCode: false })}</Text>
                  </Row>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
    <Confetti play={celebrate} />
    </View>
  );
}

function StreakRow({
  icon, title, stat, unit, caption, onCaption, t,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  stat: StreakStat;
  unit: string;
  caption: string;
  onCaption: boolean;
  t: Palette;
}) {
  const s = makeStyles(t);
  return (
    <Card>
      <Row between>
        <Row style={{ gap: space(3), flex: 1 }}>
          <Tico icon={icon} color={onCaption ? t.positive : t.gold} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>{title}</Text>
            <Text style={[s.rowCaption, { color: onCaption ? t.positive : t.ink2 }]} numberOfLines={1}>
              {caption}
            </Text>
          </View>
        </Row>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.streakNum}>{stat.current}</Text>
          <Text style={s.streakUnit}>{unit}{stat.current === 1 ? "" : "s"} · best {stat.best}</Text>
        </View>
      </Row>
    </Card>
  );
}

function GoalBar({ spent, target }: { spent: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, spent / target) : 0;
  const over = target > 0 && spent > target;
  return (
    <View style={{ marginTop: 12 }}>
      <ProgressBar progress={ratio} tone={over ? "negative" : "positive"} height={6} />
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  dim: { color: c.ink2, marginTop: space(4) },
  big: { color: c.ink, fontSize: 40, fontWeight: "800", fontVariant: ["tabular-nums"], lineHeight: 44 },
  bigSub: { color: c.ink2, fontSize: 13, marginTop: 2 },
  best: { color: c.muted, fontSize: 11, fontWeight: "600" },
  rowTitle: { color: c.ink, fontSize: 15, fontWeight: "700" },
  rowCaption: { fontSize: 12, marginTop: 3 },
  streakNum: { color: c.ink, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  streakUnit: { color: c.muted, fontSize: 11, marginTop: 1 },
  goal: { paddingVertical: space(3) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  swatch: { width: 14, height: 14, borderRadius: 5 },
  goalName: { color: c.ink, fontSize: 15, fontWeight: "600", flex: 1 },
  goalStreak: { color: c.gold, fontSize: 12, fontWeight: "700" },
  goalMeta: { color: c.ink2, fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] },
  emptyTitle: { color: c.ink, fontSize: 15, fontWeight: "700" },
  emptySub: { color: c.ink2, fontSize: 13, marginTop: space(1), lineHeight: 19 },
});
