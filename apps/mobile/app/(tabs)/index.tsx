import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, MoneyText, Pill, Row, SectionLabel, Tico } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { dayLabel, monthLabel, percent } from "../../src/lib/format";
import { iconForCategory } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/theme";
import { space, type Palette } from "../../src/theme/tokens";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { c: t } = useTheme();
  const s = makeStyles(t);
  const { period, next, prev, isCurrent } = usePeriod();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period),
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Row between>
        <View>
          <Text style={s.greet}>Rabbit Dairy{c.isDemo ? " · Demo" : ""}</Text>
          <Row style={{ gap: space(2) }}>
            <Pressable onPress={prev} hitSlop={10}><Ionicons name="chevron-back" size={18} color={t.ink2} /></Pressable>
            <Text style={s.title}>{monthLabel(period)}</Text>
            <Pressable onPress={next} hitSlop={10} disabled={isCurrent}>
              <Ionicons name="chevron-forward" size={18} color={isCurrent ? t.muted : t.ink2} />
            </Pressable>
          </Row>
        </View>
        <Pressable
          style={s.avatar}
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={s.avatarText}>SN</Text>
        </Pressable>
      </Row>

      {isLoading || !data ? (
        <Text style={s.dim}>Loading…</Text>
      ) : (
        <>
          {/* Net balance — the one number, said once. */}
          <Card hero>
            <Row between>
              <SectionLabel>Net balance · this month</SectionLabel>
              <Pill tone="positive">+{percent(data.summary.savingsRate)}</Pill>
            </Row>
            <MoneyText amount={data.summary.netBalance} size={30} style={{ marginTop: 6 }} />
            <SplitBar expenseRate={data.summary.expenseRate} c={t} />
            <Row between style={{ marginTop: 7 }}>
              <Text style={s.cap}>Spent {percent(data.summary.expenseRate)}</Text>
              <Text style={s.cap}>Kept {percent(1 - data.summary.expenseRate)}</Text>
            </Row>
          </Card>

          {/* Income vs expenses — a two-card mini-quad. */}
          <Row style={{ gap: space(3), alignItems: "stretch" }}>
            <Card style={{ flex: 1 }}>
              <SectionLabel>Income</SectionLabel>
              <MoneyText amount={data.summary.income} signed currency={false} size={16} style={{ marginTop: 5 }} />
            </Card>
            <Card style={{ flex: 1 }}>
              <SectionLabel>Expenses</SectionLabel>
              <MoneyText amount={data.summary.expenses.negated()} signed currency={false} size={16} style={{ marginTop: 5 }} />
            </Card>
          </Row>

          <Row between style={{ marginTop: space(1) }}>
            <SectionLabel>Recent activity</SectionLabel>
            <Pressable onPress={() => router.push("/activity")} hitSlop={8}>
              <Text style={s.seeAll}>See all</Text>
            </Pressable>
          </Row>
          <View>
            {data.recent.map((t2, i) => (
              <Pressable
                key={t2.id}
                style={[s.txn, i < data.recent.length - 1 && s.txnBorder]}
                onPress={() => router.push(`/transaction/${t2.id}`)}
              >
                <Tico icon={iconForCategory(t2.categoryName, t2.categoryType)} color={t2.categoryColor} />
                <View style={{ flex: 1 }}>
                  <Text style={s.txnTitle}>{t2.title}</Text>
                  <Row style={{ gap: 5 }}>
                    <Text style={s.txnMeta}>{dayLabel(t2.occurredAt)}</Text>
                    {t2.hasVoiceNote ? <Ionicons name="mic" size={11} color={t.gold} /> : null}
                    {t2.hasReceipt ? <Ionicons name="camera" size={11} color={t.gold} /> : null}
                  </Row>
                </View>
                <MoneyText amount={t2.signedAmount} signed currency={false} size={13} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SplitBar({ expenseRate, c }: { expenseRate: number; c: Palette }) {
  const spent = Math.max(0, Math.min(1, expenseRate));
  return (
    <View style={[styles.splitTrack, { backgroundColor: c.card2 }]}>
      <View style={{ flex: spent, backgroundColor: c.negative }} />
      <View style={{ flex: 1 - spent, backgroundColor: c.positive }} />
    </View>
  );
}

const styles = StyleSheet.create({
  splitTrack: {
    flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 16,
  },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { backgroundColor: c.bg },
    greet: { color: c.ink2, fontSize: 12 },
    title: { color: c.ink, fontSize: 22, fontWeight: "800", marginTop: 2 },
    avatar: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: c.avatarBg,
      borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: c.gold, fontWeight: "700", fontSize: 12 },
    dim: { color: c.ink2 },
    cap: { color: c.ink2, fontSize: 10 },
    seeAll: { color: c.gold, fontSize: 10, fontWeight: "700" },
    txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    txnBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    txnTitle: { color: c.ink, fontSize: 13, fontWeight: "600" },
    txnMeta: { color: c.muted, fontSize: 10, marginTop: 1 },
  });
