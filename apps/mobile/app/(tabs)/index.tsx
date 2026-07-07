import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, MoneyText, Pill, Row, SectionLabel, Tico } from "../../src/components/ui";
import { useAuth, useContainer } from "../../src/lib/auth";
import { usePeriod } from "../../src/lib/period";
import { greeting, monthLabel, percent, shortDate } from "../../src/lib/format";
import { iconForCategory } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { space, type Palette } from "../../src/theme/tokens";

/** First name for the greeting, from the signed-in email (fallback "there"). */
function firstName(email: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0]!.replace(/[._-]+/g, " ").trim().split(" ")[0]!;
  return local ? local[0]!.toUpperCase() + local.slice(1) : "there";
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const { email } = useAuth();
  const t = useTheme();
  const s = makeStyles(t);
  const { period, next, prev, isCurrent } = usePeriod();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period.toString()],
    queryFn: () => c.queries.dashboard.execute(c.userId, period),
  });

  function pickMonth() {
    const buttons = [
      { text: "Previous month", onPress: prev },
      ...(!isCurrent ? [{ text: "Next month", onPress: next }] : []),
      { text: "Cancel", style: "cancel" as const },
    ];
    Alert.alert("Change month", monthLabel(period), buttons);
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Row between>
        <View>
          <Text style={s.greet}>{greeting()}, {firstName(email)}</Text>
          <Pressable onPress={pickMonth} hitSlop={8}>
            <Row style={{ gap: space(1.5) }}>
              <Text style={s.title}>{monthLabel(period)}</Text>
              <Ionicons name="chevron-down" size={18} color={t.ink2} />
            </Row>
          </Pressable>
        </View>
        <Pressable
          style={s.avatar}
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={s.avatarText}>{firstName(email).slice(0, 2).toUpperCase()}</Text>
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

          {/* Income vs expenses — a two-card mini-quad; colour carries the sign. */}
          <Row style={{ gap: space(3), alignItems: "stretch" }}>
            <Card style={{ flex: 1 }}>
              <SectionLabel>Income</SectionLabel>
              <Text style={[s.statVal, { color: t.positive }]}>{data.summary.income.format({ withCode: false })}</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <SectionLabel>Expenses</SectionLabel>
              <Text style={[s.statVal, { color: t.negative }]}>{data.summary.expenses.format({ withCode: false })}</Text>
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
                    <Text style={s.txnMeta}>{t2.categoryName} · {shortDate(t2.occurredAt)}</Text>
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
    statVal: { fontSize: 18, fontWeight: "800", marginTop: 5, fontVariant: ["tabular-nums"] },
    cap: { color: c.ink2, fontSize: 10 },
    seeAll: { color: c.gold, fontSize: 10, fontWeight: "700" },
    txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    txnBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    txnTitle: { color: c.ink, fontSize: 13, fontWeight: "600" },
    txnMeta: { color: c.muted, fontSize: 10, marginTop: 1 },
  });
