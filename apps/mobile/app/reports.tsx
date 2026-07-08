import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import type { BreakdownDimension, BreakdownSlice, CashFlowView } from "@rabbit/application";
import { Card, MoneyText, PageHeader, Row, SectionLabel, Tico } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { iconForCategory } from "../src/theme/icons";
import { monthLabel, percent, shortDate } from "../src/lib/format";
import { chart, space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

const HUES = [chart.green, chart.amber, chart.blue, chart.red, chart.violet];
const DIMS: { key: BreakdownDimension; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "account", label: "Account" },
  { key: "method", label: "Method" },
];
const CW = Dimensions.get("window").width - space(4) * 2 - 40; // card inner width

/** Compact FCFA label, e.g. 1.2M / 820k / 500. */
function abbrev(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const [dim, setDim] = useState<BreakdownDimension>("category");
  const [activeSlice, setActiveSlice] = useState(0);

  const { data: flow } = useQuery({
    queryKey: ["cash-flow", period.toString()],
    queryFn: () => c.queries.cashFlow.execute(c.userId, period, 6),
  });
  const { data: report } = useQuery({
    queryKey: ["spending-report", period.toString()],
    queryFn: () => c.queries.spendingReport.execute(c.userId, period),
  });

  const slices = report
    ? dim === "category" ? report.byCategory : dim === "account" ? report.byAccount : report.byMethod
    : [];
  const pieData = slices.map((sl, i) => ({
    value: Math.max(sl.amount.major, 0.0001),
    color: sl.color ?? HUES[i % HUES.length]!,
    focused: i === activeSlice,
  }));
  const focused = slices[activeSlice];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6), paddingTop: 0, gap: space(3) }}
    >
      <PageHeader eyebrow="Reports" title={monthLabel(period)} topInset={insets.top} />

      {/* ---- Cash flow ---- */}
      <Card>
        <Row between>
          <SectionLabel>Cash flow · 6 months</SectionLabel>
          <Text style={s.unit}>tap a bar</Text>
        </Row>
        {flow ? <CashFlowChart data={flow} t={t} /> : null}
        <Row style={{ gap: space(3), marginTop: space(2) }}>
          <Legend color={chart.green} label="Income" t={t} />
          <Legend color={chart.red} label="Expense" t={t} />
        </Row>
        {flow ? <View style={s.divider} /> : null}
        {flow ? (
          <Row between>
            <View>
              <Text style={s.metaLabel}>Net this month</Text>
              <MoneyText amount={flow.months[flow.months.length - 1]!.net} signed size={18} style={{ marginTop: 2 }} />
            </View>
            {flow.expensesMoM !== null ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.metaLabel}>Spending vs last</Text>
                <Text style={[s.mom, { color: flow.expensesMoM > 0 ? t.negative : t.positive }]}>
                  {flow.expensesMoM > 0 ? "↑" : "↓"} {percent(Math.abs(flow.expensesMoM), 0)}
                </Text>
              </View>
            ) : null}
          </Row>
        ) : null}
      </Card>

      {/* ---- Savings rate ---- */}
      {flow ? (
        <Card>
          <Row between>
            <SectionLabel>Savings rate · drag to explore</SectionLabel>
            <Text style={s.rate}>{percent(flow.savingsRate)}</Text>
          </Row>
          <SavingsLine data={flow} t={t} />
        </Card>
      ) : null}

      {/* ---- Spending breakdown ---- */}
      <SectionLabel>Spending breakdown</SectionLabel>
      <View style={s.segment}>
        {DIMS.map((d) => (
          <Pressable
            key={d.key}
            onPress={() => { setDim(d.key); setActiveSlice(0); }}
            style={[s.seg, dim === d.key && s.segOn]}
          >
            <Text style={[s.segText, dim === d.key && s.segTextOn]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <Card>
        {slices.length === 0 ? (
          <Text style={[s.dim, { paddingVertical: space(3), textAlign: "center" }]}>No spending this month.</Text>
        ) : (
          <>
            <View style={{ alignItems: "center", paddingVertical: space(2) }}>
              <PieChart
                data={pieData}
                donut
                radius={CW * 0.27}
                innerRadius={CW * 0.17}
                innerCircleColor={t.card}
                focusOnPress
                onPress={(_item: unknown, index: number) => setActiveSlice(index)}
                centerLabelComponent={() => (
                  <View style={{ alignItems: "center" }}>
                    <Text style={s.centerPct}>{focused ? percent(focused.percent, 0) : ""}</Text>
                    <Text style={s.centerLabel} numberOfLines={1}>{focused?.label ?? ""}</Text>
                  </View>
                )}
              />
            </View>
            <View style={{ height: 1, backgroundColor: t.line, marginBottom: space(1) }} />
            {slices.map((sl, i) => (
              <Pressable key={sl.key} onPress={() => setActiveSlice(i)}>
                <BreakdownRow slice={sl} index={i} last={i === slices.length - 1} active={i === activeSlice} t={t} s={s} />
              </Pressable>
            ))}
          </>
        )}
      </Card>

      {/* ---- Top spends ---- */}
      {report && report.topSpends.length > 0 ? (
        <>
          <SectionLabel>Top spends</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            {report.topSpends.map((it, i) => (
              <View key={it.id} style={[s.topRow, i < report.topSpends.length - 1 && s.border]}>
                <Tico icon={iconForCategory(it.categoryName, "variable_expense")} color={it.categoryColor} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={s.topTitle}>{it.title}</Text>
                  <Text style={s.topMeta}>{it.categoryName} · {shortDate(it.occurredAt)}</Text>
                </View>
                <MoneyText amount={it.amount.negated()} signed currency={false} size={15} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function CashFlowChart({ data, t }: { data: CashFlowView; t: Palette }) {
  const barData = data.months.flatMap((m) => [
    { value: m.income.major, frontColor: chart.green, spacing: 3, label: m.label, labelWidth: 34, labelTextStyle: { color: t.muted, fontSize: 10 } },
    { value: m.expenses.major, frontColor: chart.red },
  ]);
  return (
    <BarChart
      data={barData}
      width={CW - 16}
      height={130}
      barWidth={13}
      barBorderRadius={3}
      initialSpacing={12}
      spacing={20}
      hideRules
      yAxisThickness={0}
      xAxisThickness={0}
      hideYAxisText
      noOfSections={3}
      maxValue={Math.max(1, data.peak.major)}
      isAnimated
      animationDuration={700}
      focusBarOnPress
      renderTooltip={(item: { value: number; frontColor: string }) => (
        <View style={[styles.tip, { backgroundColor: t.ink }]}>
          <Text style={{ color: t.bg, fontSize: 11, fontWeight: "800" }}>{abbrev(item.value)}</Text>
        </View>
      )}
    />
  );
}

function SavingsLine({ data, t }: { data: CashFlowView; t: Palette }) {
  const lineData = data.months.map((m) => ({
    value: Math.round(Math.max(0, Math.min(1, m.savingsRate)) * 100),
    label: m.label,
  }));
  return (
    <View style={{ marginTop: space(2), marginLeft: -8 }}>
      <LineChart
        data={lineData}
        width={CW - 24}
        height={120}
        curved
        areaChart
        color={t.positive}
        thickness={2.5}
        startFillColor={t.positive}
        endFillColor={t.positive}
        startOpacity={0.22}
        endOpacity={0.02}
        dataPointsColor={t.positive}
        dataPointsRadius={3}
        hideRules
        yAxisThickness={0}
        xAxisThickness={0}
        hideYAxisText
        maxValue={100}
        noOfSections={2}
        xAxisLabelTextStyle={{ color: t.muted, fontSize: 10 }}
        isAnimated
        animationDuration={800}
        pointerConfig={{
          pointerColor: t.positive,
          pointerStripColor: t.line,
          pointerStripHeight: 120,
          radius: 5,
          pointerLabelWidth: 60,
          pointerLabelHeight: 30,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: { value: number }[]) => (
            <View style={[styles.tip, { backgroundColor: t.ink }]}>
              <Text style={{ color: t.bg, fontSize: 11, fontWeight: "800" }}>{items[0]?.value ?? 0}%</Text>
            </View>
          ),
        }}
      />
    </View>
  );
}

function BreakdownRow({ slice, index, last, active, t, s }: { slice: BreakdownSlice; index: number; last: boolean; active: boolean; t: Palette; s: ReturnType<typeof makeStyles> }) {
  const color = slice.color ?? HUES[index % HUES.length]!;
  return (
    <View style={[s.brRow, !last && s.border, active && { opacity: 1 }, !active && { opacity: 0.72 }]}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Row between>
          <Text style={s.brLabel}>{slice.label}</Text>
          <MoneyText amount={slice.amount} currency={false} size={14} />
        </Row>
        <View style={s.track}>
          <View style={{ width: `${Math.max(2, slice.percent * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: color }} />
        </View>
        <Row between style={{ marginTop: 4 }}>
          <Text style={s.brPct}>{percent(slice.percent, 0)}</Text>
          {slice.momDelta !== null ? (
            <Text style={[s.brMom, { color: slice.momDelta > 0 ? t.negative : t.positive }]}>
              {slice.momDelta > 0 ? "↑" : "↓"} {percent(Math.abs(slice.momDelta), 0)} vs last
            </Text>
          ) : null}
        </Row>
      </View>
    </View>
  );
}

function Legend({ color, label, t }: { color: string; label: string; t: Palette }) {
  return (
    <Row style={{ gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: t.ink2, fontSize: 11 }}>{label}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  tip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
});

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  unit: { color: c.muted, fontSize: 10, fontWeight: "600" },
  dim: { color: c.ink2, fontSize: 13 },
  divider: { height: 1, backgroundColor: c.line, marginVertical: space(3) },
  metaLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  mom: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  rate: { color: c.positive, fontSize: 18, fontWeight: "800" },
  centerPct: { color: c.ink, fontSize: 20, fontWeight: "800" },
  centerLabel: { color: c.ink2, fontSize: 10, maxWidth: CW * 0.3, textAlign: "center" },
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 13, padding: 3 },
  seg: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space(2), borderRadius: 10 },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 13, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  brRow: { flexDirection: "row", alignItems: "flex-start", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  dot: { width: 11, height: 11, borderRadius: 4, marginTop: 4 },
  brLabel: { color: c.ink, fontSize: 14, fontWeight: "600" },
  track: { height: 6, borderRadius: 3, backgroundColor: c.card2, overflow: "hidden", marginTop: 8 },
  brPct: { color: c.muted, fontSize: 11, fontWeight: "700" },
  brMom: { fontSize: 11, fontWeight: "700" },
  topRow: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  topTitle: { color: c.ink, fontSize: 14, fontWeight: "600" },
  topMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
});
