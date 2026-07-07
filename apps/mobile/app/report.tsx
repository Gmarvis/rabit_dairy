import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import type { CategorySlice } from "@rabbit/application";
import { Card, MoneyText, PageHeader, Row, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { monthLabel, percent } from "../src/lib/format";
import { space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();

  const { data } = useQuery({
    queryKey: ["monthly-report", period.toString()],
    queryFn: () => c.queries.monthlyReport.execute(c.userId, period),
  });

  async function exportReport() {
    if (!data) return;
    const lines = [
      `Rabbit Dairy — ${monthLabel(period)}`,
      `Spent: ${data.summary.expenses.format()} · ${data.summary.transactionCount} txns`,
      `Income: ${data.summary.income.format()} · Net: ${data.summary.netBalance.format()}`,
      "",
      ...data.topExpenses.map((e) => `${e.categoryName}: ${e.amount.format()} (${percent(e.percentOfExpenses, 0)})`),
    ];
    await Share.share({ title: `Report · ${monthLabel(period)}`, message: lines.join("\n") });
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), paddingTop: 0, gap: space(3) }}
    >
      <PageHeader
        eyebrow="Monthly report"
        title={monthLabel(period)}
        topInset={insets.top}
        right={
          <Pressable style={s.exportPill} onPress={exportReport}>
            <Text style={s.exportText}>Export</Text>
          </Pressable>
        }
      />

      {data ? (
        <>
          <Card style={{ alignItems: "center", paddingVertical: space(6) }}>
            <View style={s.donutWrap}>
              <Donut slices={data.byCategory} total={data.summary.expenses.major} trackColor={t.card2} />
              <View style={s.center}>
                <Text style={s.centerBig}>{data.summary.expenses.format({ withCode: false })}</Text>
                <Text style={s.centerSub}>spent · {data.summary.transactionCount} txns</Text>
              </View>
            </View>
          </Card>

          <Card style={{ paddingVertical: space(1) }}>
            {data.topExpenses.length === 0 ? (
              <Text style={[s.dim, { paddingVertical: space(2) }]}>No expenses this month.</Text>
            ) : (
              data.topExpenses.map((slice, i) => (
                <View key={slice.categoryName} style={[s.row, i < data.topExpenses.length - 1 && s.border]}>
                  <View style={[s.dot, { backgroundColor: slice.color }]} />
                  <Text style={s.cat}>{slice.categoryName}</Text>
                  <Text style={s.pct}>{percent(slice.percentOfExpenses, 0)}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <Card><Text style={s.dim}>Loading…</Text></Card>
      )}
    </ScrollView>
  );
}

/** A donut built from stacked stroke-dasharray arcs. */
function Donut({ slices, total, trackColor }: { slices: CategorySlice[]; total: number; trackColor: string }) {
  const R = 46, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.amount.major / total : 0;
    const len = frac * C;
    const arc = { color: s.color, dash: `${len} ${C - len}`, offset: -offset };
    offset += len;
    return arc;
  });
  return (
    <Svg width={176} height={176} viewBox="0 0 120 120" style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={60} cy={60} r={R} fill="none" stroke={trackColor} strokeWidth={15} />
      {arcs.map((a, i) => (
        <Circle
          key={i}
          cx={60} cy={60} r={R} fill="none"
          stroke={a.color} strokeWidth={15} strokeLinecap="round"
          strokeDasharray={a.dash} strokeDashoffset={a.offset}
        />
      ))}
    </Svg>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    dim: { color: c.ink2 },
    exportPill: { borderWidth: 1, borderColor: c.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
    exportText: { color: c.gold, fontSize: 12, fontWeight: "800" },
    donutWrap: { width: 176, height: 176, alignItems: "center", justifyContent: "center" },
    center: { position: "absolute", alignItems: "center", justifyContent: "center" },
    centerBig: { color: c.ink, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
    centerSub: { color: c.muted, fontSize: 11, marginTop: 2 },
    row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    border: { borderBottomWidth: 1, borderBottomColor: c.line },
    dot: { width: 12, height: 12, borderRadius: 4 },
    cat: { color: c.ink, fontSize: 14, fontWeight: "600", flex: 1 },
    pct: { color: c.ink2, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  });
