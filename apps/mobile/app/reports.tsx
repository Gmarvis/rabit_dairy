import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline, Rect, Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
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

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const [dim, setDim] = useState<BreakdownDimension>("category");

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
          <Text style={s.unit}>FCFA</Text>
        </Row>
        {flow ? <CashFlowBars data={flow} /> : null}
        <Row style={{ gap: space(3), marginTop: space(2) }}>
          <Legend color={chart.green} label="Income" t={t} />
          <Legend color={chart.red} label="Expense" t={t} />
        </Row>
        {flow ? (
          <View style={s.divider} />
        ) : null}
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
            <SectionLabel>Savings rate</SectionLabel>
            <Text style={s.rate}>{percent(flow.savingsRate)}</Text>
          </Row>
          <SavingsSpark data={flow} t={t} />
        </Card>
      ) : null}

      {/* ---- Spending breakdown ---- */}
      <SectionLabel>Spending breakdown</SectionLabel>
      <View style={s.segment}>
        {DIMS.map((d) => (
          <Pressable key={d.key} onPress={() => setDim(d.key)} style={[s.seg, dim === d.key && s.segOn]}>
            <Text style={[s.segText, dim === d.key && s.segTextOn]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <Card style={{ paddingVertical: space(1) }}>
        {slices.length === 0 ? (
          <Text style={[s.dim, { paddingVertical: space(3), textAlign: "center" }]}>No spending this month.</Text>
        ) : (
          slices.map((sl, i) => (
            <BreakdownRow key={sl.key} slice={sl} index={i} last={i === slices.length - 1} t={t} s={s} />
          ))
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

function BreakdownRow({ slice, index, last, t, s }: { slice: BreakdownSlice; index: number; last: boolean; t: Palette; s: ReturnType<typeof makeStyles> }) {
  const color = slice.color ?? HUES[index % HUES.length]!;
  return (
    <View style={[s.brRow, !last && s.border]}>
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

function CashFlowBars({ data }: { data: CashFlowView }) {
  const W = 320, H = 120, base = 100, maxH = 84;
  const peak = data.peak.major || 1;
  const slot = W / data.months.length;
  const bw = 6;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 8 }}>
      {data.months.map((m, i) => {
        const cx = i * slot + slot / 2;
        const ih = (m.income.major / peak) * maxH;
        const eh = (m.expenses.major / peak) * maxH;
        return (
          <Fragment key={m.month}>
            <Rect x={cx - bw - 1.5} y={base - ih} width={bw} height={Math.max(ih, 0)} rx={2.5} fill={chart.green} />
            <Rect x={cx + 1.5} y={base - eh} width={bw} height={Math.max(eh, 0)} rx={2.5} fill={chart.red} />
          </Fragment>
        );
      })}
    </Svg>
  );
}

function SavingsSpark({ data, t }: { data: CashFlowView; t: Palette }) {
  const vals = data.months.map((m) => Math.max(0, Math.min(1, m.savingsRate)));
  const W = 300, H = 44;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - v * (H - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1]!.split(",");
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 10 }}>
      <Polyline points={pts.join(" ")} fill="none" stroke={t.positive} strokeWidth={2.5} />
      <Circle cx={Number(last[0])} cy={Number(last[1])} r={3.5} fill={t.positive} />
    </Svg>
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

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  unit: { color: c.muted, fontSize: 10 },
  dim: { color: c.ink2, fontSize: 13 },
  divider: { height: 1, backgroundColor: c.line, marginVertical: space(3) },
  metaLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  mom: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  rate: { color: c.positive, fontSize: 18, fontWeight: "800" },
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
