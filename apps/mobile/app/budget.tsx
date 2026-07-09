import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, PageHeader, ProgressBar, Row, SectionLabel, SkeletonList, withAlpha } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { monthLabel, percent } from "../src/lib/format";
import { space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const { data } = useQuery({
    queryKey: ["budget-vs-actual", period.toString()],
    queryFn: () => c.queries.budgetVsActual.execute(c.userId, period),
  });

  const overallPct = Math.max(0, Math.min(1, data?.overallPercentUsed ?? 0));

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), paddingTop: 0, gap: space(3) }}
    >
      <PageHeader eyebrow="Budget vs actual" title={monthLabel(period)} topInset={insets.top} />

      {!data ? <SkeletonList rows={5} /> : null}

      {data?.lines.length === 0 ? (
        <Card><Text style={s.dim}>No spending or budgets set for this month yet.</Text></Card>
      ) : null}

      {data?.lines.map((l) => {
        const pct = Math.max(0, Math.min(1, l.percentUsed));
        const over = l.status === "over" || (l.status === "no_budget" && !l.actual.isZero);
        const statusColor = over ? t.negative : l.status === "at" ? t.gold : t.positive;
        const overBy = (l.actual.major - l.budget.major).toLocaleString("en-US");
        const statusText = over ? `over by ${overBy}` : `${percent(l.percentUsed, 0)} used`;
        return (
          <Card key={l.categoryId} style={over ? { borderColor: withAlpha(t.negative, 0.4) } : undefined}>
            <Row between>
              <Text style={s.cat}>{l.categoryName}</Text>
              <Text style={[s.status, { color: statusColor }]}>{statusText}</Text>
            </Row>
            <View style={{ marginTop: 10 }}>
              <ProgressBar progress={pct} tone={over ? "negative" : l.status === "at" ? "gold" : "positive"} />
            </View>
            <Row between style={{ marginTop: 6 }}>
              <Text style={s.meta}>{l.actual.format({ withCode: false })} spent</Text>
              <Text style={s.meta}>
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
            <Text style={s.overall}>{data.totalBudget.isZero ? "—" : percent(data.overallPercentUsed, 0)}</Text>
          </Row>
          <View style={{ marginTop: 10 }}>
            <ProgressBar progress={overallPct} tone="positive" />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    dim: { color: c.ink2 },
    cat: { color: c.ink, fontSize: 14, fontWeight: "700" },
    status: { fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
    track: { height: 8, borderRadius: 5, backgroundColor: c.card2, overflow: "hidden", marginTop: 10 },
    meta: { color: c.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
    overall: { color: c.positive, fontSize: 16, fontWeight: "800" },
  });
