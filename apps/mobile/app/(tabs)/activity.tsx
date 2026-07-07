import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Fragment, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TransactionListItem } from "@rabbit/application";
import { Card, MoneyText, Tico } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { dayLabel, methodLabel, monthLabel } from "../../src/lib/format";
import { iconForCategory } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/theme";
import { radius, space, type Palette } from "../../src/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "savings", label: "Savings" },
  { key: "business", label: "Business" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(type: string, filter: FilterKey): boolean {
  switch (filter) {
    case "all": return true;
    case "income": return type === "income";
    case "expense": return type === "fixed_expense" || type === "variable_expense";
    case "savings": return type === "savings";
    case "business": return type === "business_cost";
  }
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { c: t } = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();
  const [filter, setFilter] = useState<FilterKey>("all");
  const { data } = useQuery({
    queryKey: ["activity", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period, 100),
  });

  // Group by day for the day headers (view-only filter applied first).
  const groups = new Map<string, TransactionListItem[]>();
  for (const tx of data?.recent ?? []) {
    if (!matchesFilter(tx.categoryType, filter)) continue;
    const key = dayLabel(tx.occurredAt);
    const bucket = groups.get(key) ?? [];
    bucket.push(tx);
    groups.set(key, bucket);
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(2) }}
    >
      <Text style={s.title}>Transactions</Text>
      <Text style={s.month}>{monthLabel(period)}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space(2), paddingVertical: space(1) }}
      >
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {[...groups.entries()].map(([day, items]) => (
        <Fragment key={day}>
          <Text style={s.day}>{day}</Text>
          <Card style={{ paddingVertical: space(1) }}>
            {items.map((tx, i) => (
              <Pressable
                key={tx.id}
                style={[s.txn, i < items.length - 1 && s.border]}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              >
                <Tico icon={iconForCategory(tx.categoryName, tx.categoryType)} color={tx.categoryColor} />
                <View style={{ flex: 1 }}>
                  <Text style={s.txnTitle}>{tx.title}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.meta}>
                      {tx.categoryName}
                      {tx.paymentMethod ? ` · ${methodLabel(tx.paymentMethod)}` : ""}
                    </Text>
                    {tx.hasVoiceNote ? <Ionicons name="mic" size={11} color={t.gold} /> : null}
                  </View>
                </View>
                <MoneyText amount={tx.signedAmount} signed currency={false} size={13} />
              </Pressable>
            ))}
          </Card>
        </Fragment>
      ))}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    title: { color: c.ink, fontSize: 22, fontWeight: "800" },
    month: { color: c.ink2, fontSize: 12, marginBottom: space(1) },
    chip: {
      paddingHorizontal: space(3), paddingVertical: space(1.5), borderRadius: radius.pill,
      borderWidth: 1, borderColor: c.line, backgroundColor: c.card,
    },
    chipOn: { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
    chipText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
    chipTextOn: { color: c.gold, fontWeight: "700" },
    day: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginTop: space(2) },
    txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    border: { borderBottomWidth: 1, borderBottomColor: c.line },
    txnTitle: { color: c.ink, fontSize: 13, fontWeight: "600" },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
    meta: { color: c.muted, fontSize: 10 },
  });
