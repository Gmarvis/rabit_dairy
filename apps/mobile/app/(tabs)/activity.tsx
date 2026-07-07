import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TransactionListItem } from "@rabbit/application";
import { Card, MoneyText } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { dayLabel, methodLabel, monthLabel } from "../../src/lib/format";
import { colors, radius, space } from "../../src/theme/tokens";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const c = useContainer();
  const { period } = usePeriod();
  const { data } = useQuery({
    queryKey: ["activity", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period, 100),
  });

  // Group by day for the day headers.
  const groups = new Map<string, TransactionListItem[]>();
  for (const t of data?.recent ?? []) {
    const key = dayLabel(t.occurredAt);
    const bucket = groups.get(key) ?? [];
    bucket.push(t);
    groups.set(key, bucket);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(2) }}
    >
      <Text style={styles.title}>Transactions</Text>
      <Text style={styles.month}>{monthLabel(period)}</Text>
      {[...groups.entries()].map(([day, items]) => (
        <Fragment key={day}>
          <Text style={styles.day}>{day}</Text>
          <Card style={{ paddingVertical: space(1) }}>
            {items.map((t, i) => (
              <View key={t.id} style={[styles.txn, i < items.length - 1 && styles.border]}>
                <View style={[styles.dot, { backgroundColor: t.categoryColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{t.title}</Text>
                  <Text style={styles.meta}>
                    {t.categoryName}
                    {t.paymentMethod ? ` · ${methodLabel(t.paymentMethod)}` : ""}
                    {t.hasVoiceNote ? "  🎙" : ""}
                  </Text>
                </View>
                <MoneyText amount={t.signedAmount} signed currency={false} size={13} />
              </View>
            ))}
          </Card>
        </Fragment>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  month: { color: colors.ink2, fontSize: 12, marginBottom: space(1) },
  day: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginTop: space(2) },
  txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dot: { width: 10, height: 10, borderRadius: 3 },
  txnTitle: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 10, marginTop: 1 },
});
