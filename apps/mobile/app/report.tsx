import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { YearMonth } from "@rabbit/domain";
import type { CategorySlice } from "@rabbit/application";
import { Card, MoneyText, Pill, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { percent } from "../src/lib/format";
import { colors, space } from "../src/theme/tokens";

const PERIOD = YearMonth.of(2026, 4);

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();

  const { data } = useQuery({
    queryKey: ["monthly-report", PERIOD.toString()],
    queryFn: () => c.queries.monthlyReport.execute(c.userId, PERIOD),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title={`Report · ${data?.periodLabel ?? ""}`.trim()} onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />

      {data ? (
        <>
          <Card style={{ alignItems: "center" }}>
            <Donut slices={data.byCategory} total={data.summary.expenses.major} />
            <Text style={styles.center}>
              <Text style={styles.centerBig}>{data.summary.expenses.format({ withCode: false })}</Text>
              {"\n"}
              <Text style={styles.centerSub}>spent · {data.summary.transactionCount} txns</Text>
            </Text>
          </Card>

          <SectionLabel>Top expenses</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            {data.topExpenses.length === 0 ? (
              <Text style={[styles.dim, { paddingVertical: space(2) }]}>No expenses this month.</Text>
            ) : (
              data.topExpenses.map((s, i) => (
                <View key={s.categoryName} style={[styles.row, i < data.topExpenses.length - 1 && styles.border]}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={styles.cat}>{s.categoryName}</Text>
                  <Pill tone="muted">{percent(s.percentOfExpenses, 0)}</Pill>
                  <MoneyText amount={s.amount} currency={false} size={13} style={{ marginLeft: "auto" }} />
                </View>
              ))
            )}
          </Card>

          <Row style={{ gap: space(2.5) }}>
            <Card style={styles.stat}>
              <SectionLabel>Income</SectionLabel>
              <MoneyText amount={data.summary.income} signed currency={false} size={15} style={{ marginTop: 4 }} />
            </Card>
            <Card style={styles.stat}>
              <SectionLabel>Net</SectionLabel>
              <MoneyText amount={data.summary.netBalance} signed currency={false} size={15} style={{ marginTop: 4 }} />
            </Card>
          </Row>
        </>
      ) : (
        <Card><Text style={styles.dim}>Loading…</Text></Card>
      )}
    </ScrollView>
  );
}

/** A donut built from stacked stroke-dasharray arcs. */
function Donut({ slices, total }: { slices: CategorySlice[]; total: number }) {
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
      <Circle cx={60} cy={60} r={R} fill="none" stroke={colors.card2} strokeWidth={16} />
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

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  greet: { color: colors.ink2, fontSize: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 2 },
  close: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  dim: { color: colors.ink2 },
  center: { position: "absolute", top: "42%", textAlign: "center" },
  centerBig: { color: colors.ink, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  centerSub: { color: colors.muted, fontSize: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dot: { width: 11, height: 11, borderRadius: 4 },
  cat: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  stat: { flex: 1 },
});
