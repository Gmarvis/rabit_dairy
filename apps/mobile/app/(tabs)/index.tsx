import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polygon, Polyline } from "react-native-svg";
import type { NetWorthTrendView } from "@rabbit/application";
import { Card, MoneyText, Pill, Row, SectionLabel, Tico, withAlpha } from "../../src/components/ui";
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
  const { data: trend } = useQuery({
    queryKey: ["netWorthTrend", period.toString()],
    queryFn: () => c.queries.netWorthTrend.execute(c.userId, period),
  });
  const { data: habits } = useQuery({
    queryKey: ["habits"],
    queryFn: () => c.queries.habits.execute(c.userId),
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
          {/* Net worth — all your money, the first thing you see. */}
          <Card hero>
            <SectionLabel>Total balance · all accounts</SectionLabel>
            <MoneyText amount={data.netWorth} size={40} style={{ marginTop: 8 }} />
            <Row between style={{ marginTop: 8 }}>
              <Text style={s.netSub}>
                {data.accountCount} account{data.accountCount === 1 ? "" : "s"}
                {data.dormantCount > 0 ? ` · ${data.dormantCount} dormant` : ""}
              </Text>
              <Row style={{ gap: 4 }}>
                <Ionicons
                  name={data.netWorthChange.isNegative ? "arrow-down" : "arrow-up"}
                  size={12}
                  color={data.netWorthChange.isNegative ? t.negative : t.positive}
                />
                <Text style={[s.netDelta, { color: data.netWorthChange.isNegative ? t.negative : t.positive }]}>
                  {data.netWorthChange.abs().format({ withCode: false })} this month
                </Text>
              </Row>
            </Row>
            {trend && trend.points.length > 1 ? (
              <>
                <NetWorthSpark trend={trend} c={t} />
                <Row between>
                  <Text style={s.sparkCap}>{trend.points[0]!.label}</Text>
                  <Text style={s.sparkCap}>Net worth · last {trend.points.length} months</Text>
                  <Text style={s.sparkCap}>{trend.points[trend.points.length - 1]!.label}</Text>
                </Row>
              </>
            ) : null}
          </Card>

          {/* This month's cash flow. */}
          <Row between style={{ marginTop: space(1) }}>
            <SectionLabel>This month</SectionLabel>
            <Pill tone="positive">{percent(1 - data.summary.expenseRate)} kept</Pill>
          </Row>
          <Card>
            <Row between style={{ alignItems: "stretch" }}>
              <View style={{ flex: 1 }}>
                <SectionLabel>Income</SectionLabel>
                <Text style={[s.statVal, { color: t.positive }]}>{data.summary.income.format({ withCode: false })}</Text>
              </View>
              <View style={[{ flex: 1, borderLeftWidth: 1, borderLeftColor: t.line, paddingLeft: space(4) }]}>
                <SectionLabel>Expenses</SectionLabel>
                <Text style={[s.statVal, { color: t.negative }]}>{data.summary.expenses.format({ withCode: false })}</Text>
              </View>
            </Row>
            <SplitBar expenseRate={data.summary.expenseRate} c={t} />
            <Row between style={{ marginTop: 7 }}>
              <Text style={s.cap}>Spent {percent(data.summary.expenseRate)}</Text>
              <Text style={s.cap}>Kept {percent(1 - data.summary.expenseRate)}</Text>
            </Row>
          </Card>

          {/* Habit streaks — a nudge to keep the diary going. */}
          {habits ? (
            <Pressable onPress={() => router.push("/habits")} style={{ marginTop: space(1) }}>
              <Card>
                <Row between>
                  <Row style={{ gap: space(3.5) }}>
                    <Row style={{ gap: 7 }}>
                      <Ionicons name="flame" size={16} color={t.gold} />
                      <Text style={s.streak}>{habits.logging.current}</Text>
                      <Text style={s.streakUnit}>day{habits.logging.current === 1 ? "" : "s"}</Text>
                    </Row>
                    <View style={s.vline} />
                    <Row style={{ gap: 7 }}>
                      <Ionicons name="trending-up" size={16} color={t.positive} />
                      <Text style={s.streak}>{habits.savings.current}</Text>
                      <Text style={s.streakUnit}>mo saving</Text>
                    </Row>
                  </Row>
                  <Ionicons name="chevron-forward" size={16} color={t.muted} />
                </Row>
              </Card>
            </Pressable>
          ) : null}

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
                <Tico icon={iconForCategory(t2.categoryName, t2.categoryType)} color={t2.categoryColor} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={s.txnTitle}>{t2.title}</Text>
                  <Row style={{ gap: 5 }}>
                    <Text style={s.txnMeta}>{t2.categoryName} · {shortDate(t2.occurredAt)}</Text>
                    {t2.hasVoiceNote ? <Ionicons name="mic" size={12} color={t.gold} /> : null}
                    {t2.hasReceipt ? <Ionicons name="camera" size={12} color={t.gold} /> : null}
                  </Row>
                </View>
                <MoneyText amount={t2.signedAmount} signed currency={false} size={15} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

/** A gently-filled line of net worth over the trailing months. */
function NetWorthSpark({ trend, c }: { trend: NetWorthTrendView; c: Palette }) {
  const W = 300, H = 56, pad = 4;
  const vals = trend.points.map((p) => p.value.minor);
  const lo = Math.min(trend.min, 0);
  const span = Math.max(1, trend.max - lo);
  const up = !trend.change.isNegative;
  const stroke = up ? c.positive : c.negative;

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * (W - pad * 2) + pad;
    const y = H - pad - ((v - lo) / span) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1]!.split(",");
  const area = `${pad},${H} ${pts.join(" ")} ${W - pad},${H}`;

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 14 }}>
      <Polygon points={area} fill={withAlpha(stroke, 0.14)} />
      <Polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
      <Circle cx={Number(last[0])} cy={Number(last[1])} r={3.5} fill={stroke} />
    </Svg>
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
    statVal: { fontSize: 20, fontWeight: "800", marginTop: 5, fontVariant: ["tabular-nums"] },
    netSub: { color: c.ink2, fontSize: 12 },
    netDelta: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
    cap: { color: c.ink2, fontSize: 11 },
    sparkCap: { color: c.muted, fontSize: 10, fontWeight: "600" },
    streak: { color: c.ink, fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
    streakUnit: { color: c.ink2, fontSize: 12, fontWeight: "600" },
    vline: { width: 1, alignSelf: "stretch", backgroundColor: c.line },
    seeAll: { color: c.gold, fontSize: 10, fontWeight: "700" },
    txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    txnBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    txnTitle: { color: c.ink, fontSize: 15, fontWeight: "600" },
    txnMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
  });
