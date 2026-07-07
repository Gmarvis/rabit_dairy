import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import type { CategorySlice } from "@rabbit/application";
import { Card, MoneyText, Pill, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { monthLabel, percent } from "../src/lib/format";
import { space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();

  const { data } = useQuery({
    queryKey: ["monthly-report", period.toString()],
    queryFn: () => c.queries.monthlyReport.execute(c.userId, period),
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title={`Report · ${monthLabel(period)}`} onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      {data ? (
        <>
          <Card style={{ alignItems: "center" }}>
            <Donut slices={data.byCategory} total={data.summary.expenses.major} trackColor={t.card2} />
            <Text style={s.center}>
              <Text style={s.centerBig}>{data.summary.expenses.format({ withCode: false })}</Text>
              {"\n"}
              <Text style={s.centerSub}>spent · {data.summary.transactionCount} txns</Text>
            </Text>
          </Card>

          <SectionLabel>Top expenses</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            {data.topExpenses.length === 0 ? (
              <Text style={[s.dim, { paddingVertical: space(2) }]}>No expenses this month.</Text>
            ) : (
              data.topExpenses.map((slice, i) => (
                <View key={slice.categoryName} style={[s.row, i < data.topExpenses.length - 1 && s.border]}>
                  <View style={[s.dot, { backgroundColor: slice.color }]} />
                  <Text style={s.cat}>{slice.categoryName}</Text>
                  <Pill tone="muted">{percent(slice.percentOfExpenses, 0)}</Pill>
                  <MoneyText amount={slice.amount} currency={false} size={13} style={{ marginLeft: "auto" }} />
                </View>
              ))
            )}
          </Card>

          <Row style={{ gap: space(2.5) }}>
            <Card style={s.stat}>
              <SectionLabel>Income</SectionLabel>
              <MoneyText amount={data.summary.income} signed currency={false} size={15} style={{ marginTop: 4 }} />
            </Card>
            <Card style={s.stat}>
              <SectionLabel>Net</SectionLabel>
              <MoneyText amount={data.summary.netBalance} signed currency={false} size={15} style={{ marginTop: 4 }} />
            </Card>
          </Row>
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
    <Svg width={132} height={132} viewBox="0 0 120 120" style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={60} cy={60} r={R} fill="none" stroke={trackColor} strokeWidth={16} />
      {arcs.map((a, i) => (
        <Circle
          key={i}
          cx={60} cy={60} r={R} fill="none"
          stroke={a.color} strokeWidth={16}
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
    center: { position: "absolute", top: "42%", textAlign: "center" },
    centerBig: { color: c.ink, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
    centerSub: { color: c.muted, fontSize: 9 },
    row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    border: { borderBottomWidth: 1, borderBottomColor: c.line },
    dot: { width: 11, height: 11, borderRadius: 4 },
    cat: { color: c.ink, fontSize: 12, fontWeight: "600" },
    stat: { flex: 1 },
  });
