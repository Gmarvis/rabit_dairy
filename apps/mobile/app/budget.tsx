import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, MoneyText, Pill, Row, ScreenHeader, SectionLabel, withAlpha } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { monthLabel, percent } from "../src/lib/format";
import { space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/theme";

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
  const { c: t } = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const { data } = useQuery({
    queryKey: ["budget-vs-actual", period.toString()],
    queryFn: () => c.queries.budgetVsActual.execute(c.userId, period),
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title={`Budget · ${monthLabel(period)}`} onClose={() => router.back()} closeLabel="Done" topInset={insets.top} />
      <Pressable onPress={() => router.push("/budgets")} style={s.editRow}>
        <Ionicons name="pencil" size={13} color={t.gold} />
        <Text style={s.edit}>Edit budgets</Text>
      </Pressable>

      {data?.lines.length === 0 ? (
        <Card><Text style={s.dim}>No spending or budgets set for this month yet.</Text></Card>
      ) : null}

      {data?.lines.map((l) => {
        const pct = Math.max(0, Math.min(1, l.percentUsed));
        const barColor =
          l.status === "over" ? t.negative : l.status === "at" ? t.gold : t.positive;
        return (
          <Card key={l.categoryId} style={l.status === "over" ? { borderColor: withAlpha(t.negative, 0.4) } : undefined}>
            <Row between>
              <Text style={s.cat}>{l.categoryName}</Text>
              <Pill tone={STATUS_TONE[l.status]}>
                {l.status === "over" ? "over" : l.status === "no_budget" ? "no budget" : percent(l.percentUsed, 0)}
              </Pill>
            </Row>
            <View style={s.track}>
              <View style={{ width: `${pct * 100}%`, backgroundColor: barColor, height: "100%", borderRadius: 4 }} />
            </View>
            <Row between style={{ marginTop: 5 }}>
              <Text style={s.meta}>{l.actual.format()} spent</Text>
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
            <Text style={s.overall}>
              {data.totalBudget.isZero ? "—" : percent(data.overallPercentUsed, 0)}
            </Text>
          </Row>
          <Row between style={{ marginTop: 6 }}>
            <Text style={s.meta}>Total spent</Text>
            <MoneyText amount={data.totalActual} currency={false} size={14} />
          </Row>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    edit: { color: c.gold, fontSize: 13, fontWeight: "700" },
    editRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: -space(1) },
    dim: { color: c.ink2 },
    cat: { color: c.ink, fontSize: 12, fontWeight: "600" },
    track: { height: 7, borderRadius: 4, backgroundColor: c.card2, overflow: "hidden", marginTop: 8 },
    meta: { color: c.muted, fontSize: 10 },
    overall: { color: c.positive, fontSize: 15, fontWeight: "800" },
  });
