import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart, PieChart } from "react-native-gifted-charts";
import type { PeriodSummary } from "@rabbit/domain";
import { Card, MoneyText, Row, SectionLabel, Skeleton } from "../../src/components/ui";
import { PressableScale } from "../../src/components/anim";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { abbrev, monthLabel, percent, sparkSeries } from "../../src/lib/format";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../../src/theme/tokens";

const TILE_W = (Dimensions.get("window").width - space(4) * 2 - space(3)) / 2;
const CHART_W = Dimensions.get("window").width - space(4) * 2 - 44;

const LINKS: { href: Href; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { href: "/reports", icon: "analytics", title: "Reports", sub: "Cash flow, breakdown & trends — interactive" },
  { href: "/calendar", icon: "calendar", title: "Spending calendar", sub: "A heat-map of every day's spending" },
  { href: "/habits", icon: "flame", title: "Habits", sub: "Streaks, saving & spend goals" },
  { href: "/report", icon: "pie-chart", title: "Monthly report", sub: "Where the money went this month" },
  { href: "/budget", icon: "checkbox", title: "Budget vs actual", sub: "Planned against spent, per category" },
  { href: "/yearly", icon: "bar-chart", title: "Yearly overview", sub: "12-month income & expense trend" },
];

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();

  const { data } = useQuery({
    queryKey: ["dashboard", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period),
  });
  const { data: life } = useQuery({
    queryKey: ["lifetime"],
    queryFn: () => c.queries.lifetime.execute(c.userId),
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Text style={s.title}>Insights</Text>

      {(() => {
        const balance = data?.netWorth ?? life?.netWorth;
        const monthActive = !!data && (data.summary.income.minor > 0 || data.summary.expenses.minor > 0);
        const hasLifetime = !!life && (life.transactionCount > 0 || life.netWorth.minor > 0);
        const spark = life && life.series.length > 1 ? sparkSeries(life.series.map((p) => ({ value: p.value, label: p.label }))) : null;
        return (
          <Card hero>
            {/* Hero: the balance, stated once. */}
            <Row between style={{ alignItems: "flex-start" }}>
              <SectionLabel>Total balance · all accounts</SectionLabel>
              {life?.since ? (
                <Text style={s.since}>
                  since {new Date(life.since).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}
                </Text>
              ) : null}
            </Row>
            {balance ? (
              <MoneyText amount={balance} size={32} style={{ marginTop: 6 }} />
            ) : (
              <Skeleton width={200} height={32} radius={8} style={{ marginTop: space(2) }} />
            )}

            {/* This month: how the balance moved, with the income split alongside. */}
            <View style={s.divider} />
            <Row between style={{ alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <SectionLabel>This month · {monthLabel(period)}</SectionLabel>
                {!data ? (
                  <Skeleton width={140} height={12} style={{ marginTop: space(2) }} />
                ) : monthActive ? (
                  <>
                    <MoneyText amount={data.summary.netBalance} signed currency={false} size={18} style={{ marginTop: 4 }} />
                    <Row style={{ gap: space(3), marginTop: space(2) }}>
                      {/* % of income when there's income to divide by; otherwise
                          the raw amounts, so spending from savings never reads 0%. */}
                      <Dot
                        color={t.blue}
                        label={data.summary.income.minor > 0
                          ? `${percent(data.summary.savingsRate)} saved`
                          : `${data.summary.savings.format({ withCode: false })} saved`}
                        t={t}
                      />
                      <Dot
                        color={t.negative}
                        label={data.summary.income.minor > 0
                          ? `${percent(data.summary.expenseRate)} spent`
                          : `${data.summary.expenses.format({ withCode: false })} spent`}
                        t={t}
                      />
                    </Row>
                  </>
                ) : (
                  <Text style={s.keptLine}>Nothing logged yet</Text>
                )}
              </View>
              {data && data.summary.income.minor > 0 ? <IncomeSplit summary={data.summary} t={t} /> : null}
            </Row>

            {/* All-time: lifetime earned / spent / saved + the accumulation curve. */}
            {hasLifetime ? (
              <>
                <View style={s.divider} />
                <SectionLabel>All-time</SectionLabel>
                <Row between style={{ marginTop: space(2) }}>
                  <View>
                    <Text style={s.statLabel}>Earned</Text>
                    <Text style={[s.stat, { color: t.positive }]}>{life!.earned.format({ withCode: false })}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={s.statLabel}>Spent</Text>
                    <Text style={[s.stat, { color: t.negative }]}>{life!.spent.format({ withCode: false })}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.statLabel}>Saved</Text>
                    <Text style={[s.stat, { color: t.blue }]}>{life!.saved.format({ withCode: false })}</Text>
                  </View>
                </Row>

                {spark ? (
                  <View style={{ marginTop: space(3), marginLeft: -8 }}>
                    <LineChart
                      data={spark.data}
                      maxValue={spark.maxValue}
                      width={CHART_W - 16}
                      height={120}
                      curved
                      areaChart
                      color={t.positive}
                      thickness={2.5}
                      startFillColor={t.positive}
                      endFillColor={t.positive}
                      startOpacity={0.22}
                      endOpacity={0.02}
                      hideDataPoints
                      hideRules
                      hideYAxisText
                      yAxisThickness={0}
                      xAxisThickness={0}
                      adjustToWidth
                      initialSpacing={8}
                      endSpacing={8}
                      xAxisLabelTextStyle={{ color: t.muted, fontSize: 9 }}
                      isAnimated
                      animationDuration={800}
                      pointerConfig={{
                        pointerColor: t.positive,
                        pointerStripColor: t.line,
                        pointerStripHeight: 120,
                        radius: 4,
                        pointerLabelWidth: 120,
                        pointerLabelHeight: 30,
                        autoAdjustPointerLabelPosition: true,
                        pointerLabelComponent: (items: { real?: number; value: number }[]) => (
                          <View style={{ backgroundColor: t.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Text style={{ color: t.bg, fontSize: 11, fontWeight: "800" }}>{abbrev(items[0]?.real ?? items[0]?.value ?? 0)} FCFA</Text>
                          </View>
                        ),
                      }}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </Card>
        );
      })()}

      <View style={s.grid}>
        {LINKS.map((l) => (
          <PressableScale key={l.title} onPress={() => router.push(l.href)} style={{ width: TILE_W }}>
            <Card style={s.tile}>
              <View style={s.icon}>
                <Ionicons name={l.icon} size={18} color={t.gold} />
              </View>
              <Text style={s.linkTitle}>{l.title}</Text>
              <Text style={s.linkSub}>{l.sub}</Text>
            </Card>
          </PressableScale>
        ))}
      </View>
    </ScrollView>
  );
}

/** A small pie of how the month's income was split: spent / saved / kept. */
function IncomeSplit({ summary, t }: { summary: PeriodSummary; t: Palette }) {
  const spent = Math.max(0, Math.min(1, summary.expenseRate));
  const saved = Math.max(0, Math.min(1, summary.savingsRate));
  const kept = Math.max(0, 1 - spent - saved);
  const pie = [
    { value: spent || 0.0001, color: t.negative },
    { value: saved || 0.0001, color: t.blue },
    { value: kept || 0.0001, color: t.gold },
  ];
  return <PieChart data={pie} radius={42} />;
}

function Dot({ color, label, t }: { color: string; label: string; t: Palette }) {
  return (
    <Row style={{ gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: t.ink2, fontSize: 12 }}>{label}</Text>
    </Row>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  title: { color: c.ink, fontSize: 22, fontWeight: "800" },
  keptLine: { color: c.ink2, fontSize: 12, marginTop: 4 },
  since: { color: c.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  divider: { height: 1, backgroundColor: c.line, marginVertical: space(3) },
  statLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  stat: { fontSize: 15, fontWeight: "800", marginTop: 3, fontVariant: ["tabular-nums"] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  tile: { minHeight: 132 },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  linkTitle: { color: c.ink, fontSize: 14, fontWeight: "700", marginTop: space(2.5) },
  linkSub: { color: c.ink2, fontSize: 11, marginTop: 3, lineHeight: 15 },
});
