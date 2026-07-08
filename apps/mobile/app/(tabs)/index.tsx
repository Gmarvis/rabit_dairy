import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-gifted-charts";
import type { NetWorthTrendView } from "@rabbit/application";
import { Card, MoneyText, Pill, Row, SectionLabel, Tico, withAlpha } from "../../src/components/ui";
import { CountUpMoney } from "../../src/components/anim";
import { ONBOARDED_KEY } from "../onboarding";
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
  const { period } = usePeriod();

  // Show the first-run onboarding once.
  const checkedOnboarding = useRef(false);
  useEffect(() => {
    if (checkedOnboarding.current) return;
    checkedOnboarding.current = true;
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((v) => { if (v !== "1") router.push("/onboarding"); })
      .catch(() => {});
  }, [router]);

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
  const { data: nudges } = useQuery({
    queryKey: ["nudges", period.toString()],
    queryFn: () => c.queries.nudges.execute(c.userId, period),
  });
  const { data: forecast } = useQuery({
    queryKey: ["forecast", period.toString()],
    queryFn: () => c.queries.forecast.execute(c.userId, period),
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(2), gap: space(3) }}
    >
      <Row between>
        <View>
          <Text style={s.greet}>{greeting()}, {firstName(email)}</Text>
          <Pressable onPress={() => router.push("/calendar")} hitSlop={8}>
            <Row style={{ gap: space(1.5) }}>
              <Text style={s.title}>{monthLabel(period)}</Text>
              <Ionicons name="calendar-outline" size={16} color={t.ink2} />
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
            <CountUpMoney value={data.netWorth.minor} size={40} style={{ marginTop: 8 }} />
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

          {/* Proactive heads-up nudges. */}
          {nudges && nudges.items.length > 0 ? (
            <View style={{ gap: space(2), marginTop: space(1) }}>
              {nudges.items.map((n) => {
                const tint = n.tone === "alert" ? t.negative : n.tone === "warn" ? t.gold : n.tone === "positive" ? t.positive : t.blue;
                return (
                  <Card key={n.id}>
                    <Row style={{ gap: space(3) }}>
                      <View style={[s.nudgeIcon, { backgroundColor: withAlpha(tint, 0.15) }]}>
                        <Ionicons name={n.icon as keyof typeof Ionicons.glyphMap} size={18} color={tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.nudgeTitle}>{n.title}</Text>
                        <Text style={s.nudgeBody}>{n.body}</Text>
                      </View>
                    </Row>
                  </Card>
                );
              })}
            </View>
          ) : null}

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

          {/* Forward-looking pace — framed to save more, not spend more. */}
          {forecast && forecast.isCurrentMonth && forecast.spentSoFar.minor > 0 ? (
            <View style={{ marginTop: space(1) }}>
              <Row between>
                <SectionLabel>Month forecast</SectionLabel>
                {forecast.paceVsLastMonth !== null ? (
                  <Pill tone={forecast.paceVsLastMonth <= 0 ? "positive" : "negative"}>
                    {forecast.paceVsLastMonth <= 0
                      ? `${percent(Math.abs(forecast.paceVsLastMonth), 0)} under last mo`
                      : `${percent(forecast.paceVsLastMonth, 0)} over last mo`}
                  </Pill>
                ) : null}
              </Row>
              <Card style={{ marginTop: space(2.5) }}>
                {(() => {
                  const saving = forecast.projectedNet.minor >= 0;
                  const tint = saving ? t.positive : t.negative;
                  const headline = saving ? forecast.onTrackToSave : forecast.projectedNet.abs();
                  const denom = forecast.income.minor > 0 ? forecast.income.minor : forecast.projectedSpend.minor;
                  const frac = denom > 0 ? Math.min(1, forecast.spentSoFar.minor / denom) : 0;
                  const proj = denom > 0 ? Math.min(1, forecast.projectedSpend.minor / denom) : 0;
                  return (
                    <>
                      <Text style={s.fcLabel}>{saving ? "On track to save this month" : "Heading over by"}</Text>
                      <Text style={[s.fcVal, { color: tint }]}>
                        {headline.format({ withCode: false })}
                        <Text style={s.fcCur}> FCFA</Text>
                      </Text>
                      <Text style={s.fcSub}>
                        ≈ {forecast.dailyPace.format({ withCode: false })}/day · {forecast.daysLeft} day{forecast.daysLeft === 1 ? "" : "s"} left
                      </Text>

                      {/* Spent-so-far vs projected, against income. */}
                      <View style={s.fcTrack}>
                        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${proj * 100}%`, backgroundColor: withAlpha(t.negative, 0.25) }} />
                        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${frac * 100}%`, backgroundColor: t.negative, borderRadius: 3 }} />
                      </View>
                      <Text style={s.fcCap}>
                        {forecast.spentSoFar.format({ withCode: false })} spent · ~{forecast.projectedSpend.format({ withCode: false })} projected
                      </Text>

                      {forecast.saveIfCapped.minor > 0 ? (
                        <Row style={s.trimRow}>
                          <Ionicons name="trending-down" size={16} color={t.positive} />
                          <Text style={s.trimText}>
                            Ease to {forecast.suggestedDailyCap.format({ withCode: false })}/day and save{" "}
                            <Text style={{ fontWeight: "800", color: t.positive }}>{forecast.saveIfCapped.format({ withCode: false })} more</Text> before month-end.
                          </Text>
                        </Row>
                      ) : null}
                    </>
                  );
                })()}
              </Card>
            </View>
          ) : null}

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

const HERO_W = Dimensions.get("window").width - space(4) * 2 - 44;

/** Interactive net-worth line over the trailing months — drag to read a month. */
function NetWorthSpark({ trend, c }: { trend: NetWorthTrendView; c: Palette }) {
  const up = !trend.change.isNegative;
  const stroke = up ? c.positive : c.negative;
  const data = trend.points.map((p) => ({ value: p.value.minor }));
  return (
    <View style={{ marginTop: 14, marginLeft: -8 }}>
      <LineChart
        data={data}
        width={HERO_W - 16}
        height={64}
        curved
        areaChart
        color={stroke}
        thickness={2.5}
        startFillColor={stroke}
        endFillColor={stroke}
        startOpacity={0.22}
        endOpacity={0.02}
        hideDataPoints
        hideRules
        hideYAxisText
        yAxisThickness={0}
        xAxisThickness={0}
        adjustToWidth
        initialSpacing={6}
        endSpacing={6}
        isAnimated
        animationDuration={800}
        pointerConfig={{
          pointerColor: stroke,
          pointerStripColor: withAlpha(c.ink2, 0.4),
          pointerStripHeight: 64,
          radius: 4,
          pointerLabelWidth: 120,
          pointerLabelHeight: 30,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: { value: number }[]) => (
            <View style={{ backgroundColor: c.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: c.bg, fontSize: 11, fontWeight: "800" }}>
                {Number(items[0]?.value ?? 0).toLocaleString("en-US")} FCFA
              </Text>
            </View>
          ),
        }}
      />
    </View>
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
    fcLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
    fcVal: { fontSize: 28, fontWeight: "800", marginTop: 5, fontVariant: ["tabular-nums"] },
    fcCur: { fontSize: 13, fontWeight: "600", color: c.ink2 },
    fcSub: { color: c.ink2, fontSize: 12, marginTop: 4 },
    fcTrack: { height: 6, borderRadius: 3, backgroundColor: c.card2, overflow: "hidden", marginTop: 14 },
    fcCap: { color: c.muted, fontSize: 11, marginTop: 7 },
    trimRow: { gap: 8, marginTop: 14, alignItems: "flex-start" },
    trimText: { flex: 1, color: c.ink2, fontSize: 12, lineHeight: 17 },
    nudgeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    nudgeTitle: { color: c.ink, fontSize: 14, fontWeight: "700" },
    nudgeBody: { color: c.ink2, fontSize: 12, marginTop: 2, lineHeight: 17 },
    streak: { color: c.ink, fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
    streakUnit: { color: c.ink2, fontSize: 12, fontWeight: "600" },
    vline: { width: 1, alignSelf: "stretch", backgroundColor: c.line },
    seeAll: { color: c.gold, fontSize: 10, fontWeight: "700" },
    txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    txnBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
    txnTitle: { color: c.ink, fontSize: 15, fontWeight: "600" },
    txnMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
  });
