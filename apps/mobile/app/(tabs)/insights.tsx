import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart, PieChart } from "react-native-gifted-charts";
import type { PeriodSummary } from "@rabbit/domain";
import { Card, MoneyText, Row, SectionLabel } from "../../src/components/ui";
import { PressableScale } from "../../src/components/anim";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { monthLabel, percent } from "../../src/lib/format";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../../src/theme/tokens";

const TILE_W = (Dimensions.get("window").width - space(4) * 2 - space(3)) / 2;
const CHART_W = Dimensions.get("window").width - space(4) * 2 - 44;

function abbrev(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

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
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Text style={s.title}>Insights</Text>

      <Card hero>
        <Row between style={{ alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <SectionLabel>Total balance · all accounts</SectionLabel>
            {data ? (
              <>
                <MoneyText amount={data.netWorth} size={26} style={{ marginTop: 6 }} />
                <Text style={s.keptLine}>
                  {data.summary.netBalance.format({ withCode: false })} kept in {monthLabel(period)}
                </Text>
                <Row style={{ gap: space(3), marginTop: space(2) }}>
                  <Dot color={t.blue} label={`${percent(data.summary.savingsRate)} saved`} t={t} />
                  <Dot color={t.negative} label={`${percent(data.summary.expenseRate)} spent`} t={t} />
                </Row>
              </>
            ) : null}
          </View>
          {data && data.summary.income.minor > 0 ? <IncomeSplit summary={data.summary} t={t} /> : null}
        </Row>
      </Card>

      {/* All-time — the full-lifetime overview. */}
      {life && life.transactionCount > 0 ? (
        <Card>
          <Row between>
            <SectionLabel>All-time</SectionLabel>
            {life.since ? (
              <Text style={s.since}>
                since {new Date(life.since).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}
              </Text>
            ) : null}
          </Row>
          <MoneyText amount={life.netWorth} size={24} style={{ marginTop: 6 }} />
          <Text style={s.keptLine}>net worth · across all accounts</Text>
          <View style={s.divider} />
          <Row between>
            <View>
              <SectionLabel>Earned</SectionLabel>
              <Text style={[s.stat, { color: t.positive }]}>{life.earned.format({ withCode: false })}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <SectionLabel>Spent</SectionLabel>
              <Text style={[s.stat, { color: t.negative }]}>{life.spent.format({ withCode: false })}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <SectionLabel>Saved</SectionLabel>
              <Text style={[s.stat, { color: t.blue }]}>{life.saved.format({ withCode: false })}</Text>
            </View>
          </Row>

          {life.series.length > 1 ? (
            <>
              <View style={s.divider} />
              <SectionLabel>Net worth over time</SectionLabel>
              <View style={{ marginTop: space(2), marginLeft: -8 }}>
                <LineChart
                  data={life.series.map((p) => ({ value: p.value, label: p.label }))}
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
                    pointerLabelComponent: (items: { value: number }[]) => (
                      <View style={{ backgroundColor: t.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: t.bg, fontSize: 11, fontWeight: "800" }}>{abbrev(items[0]?.value ?? 0)} FCFA</Text>
                      </View>
                    ),
                  }}
                />
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

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
  stat: { fontSize: 15, fontWeight: "800", marginTop: 3, fontVariant: ["tabular-nums"] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  tile: { minHeight: 132 },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  linkTitle: { color: c.ink, fontSize: 14, fontWeight: "700", marginTop: space(2.5) },
  linkSub: { color: c.ink2, fontSize: 11, marginTop: 3, lineHeight: 15 },
});
