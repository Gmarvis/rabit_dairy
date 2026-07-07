import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, MoneyText, Pill, Row, SectionLabel } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { dayLabel, methodLabel, monthLabel, percent } from "../../src/lib/format";
import { colors, radius, space } from "../../src/theme/tokens";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { period, next, prev, isCurrent } = usePeriod();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Row between>
        <View>
          <Text style={styles.greet}>Rabbit Dairy</Text>
          <Row style={{ gap: space(2) }}>
            <Pressable onPress={prev} hitSlop={10}><Ionicons name="chevron-back" size={18} color={colors.ink2} /></Pressable>
            <Text style={styles.title}>{monthLabel(period)}</Text>
            <Pressable onPress={next} hitSlop={10} disabled={isCurrent}>
              <Ionicons name="chevron-forward" size={18} color={isCurrent ? colors.muted : colors.ink2} />
            </Pressable>
          </Row>
        </View>
        <Pressable
          style={styles.avatar}
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={styles.avatarText}>SN</Text>
        </Pressable>
      </Row>

      {c.isDemo ? <Pill tone="gold">Demo data</Pill> : null}

      {isLoading || !data ? (
        <Card><Text style={styles.dim}>Loading…</Text></Card>
      ) : (
        <>
          <Card hero>
            <Row between>
              <SectionLabel>Net balance · this month</SectionLabel>
              <Pill tone={data.summary.netBalance.isNegative ? "negative" : "positive"}>
                {percent(1 - data.summary.expenseRate)} kept
              </Pill>
            </Row>
            <MoneyText amount={data.summary.netBalance} size={28} style={{ marginTop: 4 }} />
            <SplitBar expenseRate={data.summary.expenseRate} />
            <Row between style={{ marginTop: 6 }}>
              <Text style={styles.tiny}>Spent {percent(data.summary.expenseRate)}</Text>
              <Text style={styles.tiny}>Kept {percent(1 - data.summary.expenseRate)}</Text>
            </Row>
          </Card>

          <Row style={{ gap: space(2.5) }}>
            <Card style={styles.stat}>
              <SectionLabel>Income</SectionLabel>
              <MoneyText amount={data.summary.income} signed currency={false} size={16} style={{ marginTop: 4 }} />
            </Card>
            <Card style={styles.stat}>
              <SectionLabel>Expenses</SectionLabel>
              <MoneyText amount={data.summary.expenses.negated()} signed currency={false} size={16} style={{ marginTop: 4 }} />
            </Card>
          </Row>

          <SectionLabel>Recent activity</SectionLabel>
          <Card style={{ paddingVertical: space(1) }}>
            {data.recent.map((t, i) => (
              <Pressable
                key={t.id}
                style={[styles.txn, i < data.recent.length - 1 && styles.txnBorder]}
                onPress={() => router.push(`/transaction/${t.id}`)}
              >
                <View style={[styles.dot, { backgroundColor: t.categoryColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{t.title}</Text>
                  <Text style={styles.txnMeta}>
                    {dayLabel(t.occurredAt)}
                    {t.paymentMethod ? ` · ${methodLabel(t.paymentMethod)}` : ""}
                    {t.hasVoiceNote ? "  🎙" : ""}
                    {t.hasReceipt ? "  📷" : ""}
                  </Text>
                </View>
                <MoneyText amount={t.signedAmount} signed currency={false} size={13} />
              </Pressable>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function SplitBar({ expenseRate }: { expenseRate: number }) {
  const spent = Math.max(0, Math.min(1, expenseRate));
  return (
    <View style={styles.splitTrack}>
      <View style={{ flex: spent, backgroundColor: colors.negative }} />
      <View style={{ flex: 1 - spent, backgroundColor: colors.positive }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  greet: { color: colors.ink2, fontSize: 12 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800", marginTop: 2 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "#243B2E",
    borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.gold, fontWeight: "700", fontSize: 12 },
  dim: { color: colors.ink2 },
  tiny: { color: colors.ink2, fontSize: 10 },
  stat: { flex: 1 },
  splitTrack: {
    flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden",
    marginTop: 12, gap: 3, backgroundColor: colors.card2,
  },
  txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  txnBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dot: { width: 10, height: 10, borderRadius: 3 },
  txnTitle: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  txnMeta: { color: colors.muted, fontSize: 10, marginTop: 1 },
});
