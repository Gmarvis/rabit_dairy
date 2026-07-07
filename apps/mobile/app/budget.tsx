import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearMonth } from "@rabbit/domain";
import { Card, MoneyText, Pill, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { percent } from "../src/lib/format";
import { colors, space } from "../src/theme/tokens";

const PERIOD = YearMonth.of(2026, 4);

const STATUS_TONE = {
  under: "positive",
  at: "gold",
  over: "negative",
  no_budget: "muted",
} as const;

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { data } = useQuery({
    queryKey: ["budget-vs-actual", PERIOD.toString()],
    queryFn: () => c.queries.budgetVsActual.execute(c.userId, PERIOD),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title={`Budget vs actual · ${data?.periodLabel ?? ""}`.trim()} onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />
      <Pressable onPress={() => router.push("/budgets")} style={styles.editRow}>
        <Text style={styles.edit}>✎ Edit budgets</Text>
      </Pressable>

      {data?.lines.length === 0 ? (
        <Card><Text style={styles.dim}>No spending or budgets set for this month yet.</Text></Card>
      ) : null}

      {data?.lines.map((l) => {
        const pct = Math.max(0, Math.min(1, l.percentUsed));
        const barColor =
          l.status === "over" ? colors.negative : l.status === "at" ? colors.gold : colors.positive;
        return (
          <Card key={l.categoryId}>
            <Row between>
              <Text style={styles.cat}>{l.categoryName}</Text>
              <Pill tone={STATUS_TONE[l.status]}>
                {l.status === "over" ? "over" : l.status === "no_budget" ? "no budget" : percent(l.percentUsed, 0)}
              </Pill>
            </Row>
            <View style={styles.track}>
              <View style={{ width: `${pct * 100}%`, backgroundColor: barColor, height: "100%", borderRadius: 4 }} />
            </View>
            <Row between style={{ marginTop: 5 }}>
              <Text style={styles.meta}>{l.actual.format()} spent</Text>
              <Text style={styles.meta}>
                {l.budget.isZero ? "no budget set" : `of ${l.budget.format({ withCode: false })}`}
              </Text>
            </Row>
          </Card>
        );
      })}

      {data ? (
        <Card hero>
          <Row between>
            <SectionLabel>Spent of budget</SectionLabel>
            <Text style={styles.overall}>
              {data.totalBudget.isZero ? "—" : percent(data.overallPercentUsed, 0)}
            </Text>
          </Row>
          <Row between style={{ marginTop: 6 }}>
            <Text style={styles.meta}>Total spent</Text>
            <MoneyText amount={data.totalActual} currency={false} size={14} />
          </Row>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  greet: { color: colors.ink2, fontSize: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 2 },
  close: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  edit: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  editRow: { alignSelf: "flex-start", marginTop: -space(1) },
  dim: { color: colors.ink2 },
  cat: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.card2, overflow: "hidden", marginTop: 8 },
  meta: { color: colors.muted, fontSize: 10 },
  overall: { color: colors.positive, fontSize: 15, fontWeight: "800" },
});
