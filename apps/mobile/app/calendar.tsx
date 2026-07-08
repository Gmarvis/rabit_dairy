import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearMonth } from "@rabbit/domain";
import { Card, MoneyText, PrimaryButton, Row, Tico, withAlpha } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { shortDate } from "../src/lib/format";
import { iconForCategory } from "../src/theme/icons";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const GRID_W = Dimensions.get("window").width - space(4) * 2;

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { period, setPeriod } = usePeriod();

  const realCurrent = YearMonth.fromDate(new Date());
  const [view, setView] = useState<YearMonth>(period);
  const [selected, setSelected] = useState<number | null>(null);

  const canNext = !view.equals(realCurrent);
  const pan = useRef(new Animated.Value(0)).current;

  const { data } = useQuery({
    queryKey: ["calendar", view.toString()],
    queryFn: () => c.queries.calendar.execute(c.userId, view),
  });

  function change(dir: 1 | -1) {
    if (dir === 1 && !canNext) return;
    setSelected(null);
    Animated.timing(pan, { toValue: dir * -GRID_W, duration: 130, useNativeDriver: true }).start(() => {
      setView((m) => (dir === 1 ? m.next() : m.previous()));
      pan.setValue(dir * GRID_W);
      Animated.spring(pan, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
    });
  }

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderMove: (_e, g) => {
          const damped = !canNext && g.dx < 0 ? g.dx * 0.25 : g.dx;
          pan.setValue(damped);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -60 && canNext) change(1);
          else if (g.dx > 60) change(-1);
          else Animated.spring(pan, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canNext],
  );

  // Heat colour for a day cell, scaled against the month's biggest spend. Every
  // day gets at least a faint base tint so the grid reads as a heat-map.
  function heat(minor: number): string {
    if (!data || data.maxSpent === 0 || minor === 0) return withAlpha(t.negative, 0.07);
    const ratio = minor / data.maxSpent;
    return withAlpha(t.negative, 0.18 + 0.6 * ratio);
  }

  const dayTxns = useMemo(() => {
    if (!data || selected === null) return [];
    return data.transactions.filter((tx) => new Date(tx.occurredAt).getUTCDate() === selected);
  }, [data, selected]);

  const cells: (number | null)[] = data
    ? [...Array<null>(data.firstWeekday).fill(null), ...data.days.map((d) => d.day)]
    : [];
  const isRealMonth = view.equals(realCurrent);
  const today = new Date().getUTCDate();

  return (
    <View style={s.screen}>
      <Row between style={[s.header, { paddingTop: Math.min(insets.top, space(2)) + space(2) }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.headerTitle}>Calendar</Text>
        <View style={{ width: 54 }} />
      </Row>

      {/* Month switcher */}
      <Row between style={s.monthBar}>
        <Pressable onPress={() => change(-1)} hitSlop={12} style={s.chev}>
          <Ionicons name="chevron-back" size={20} color={t.ink} />
        </Pressable>
        <Text style={s.monthLabel}>{view.monthName} {view.year}</Text>
        <Pressable onPress={() => change(1)} hitSlop={12} style={[s.chev, !canNext && { opacity: 0.3 }]} disabled={!canNext}>
          <Ionicons name="chevron-forward" size={20} color={t.ink} />
        </Pressable>
      </Row>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4) }}>
        <Row style={s.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={s.weekday}>{w}</Text>
          ))}
        </Row>

        <Animated.View style={{ transform: [{ translateX: pan }] }} {...responder.panHandlers}>
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`b${i}`} style={s.cell} />;
              const cell = data!.days[day - 1]!;
              const isToday = isRealMonth && day === today;
              const isSel = selected === day;
              return (
                <Pressable key={day} style={s.cell} onPress={() => setSelected(isSel ? null : day)}>
                  <View
                    style={[
                      s.dayBox,
                      { backgroundColor: heat(cell.spent.minor) },
                      isToday && s.today,
                      isSel && s.selected,
                    ]}
                  >
                    <Text style={[s.dayNum, isSel && { color: t.goldInk, fontWeight: "800" }]}>{day}</Text>
                    {cell.count > 0 ? (
                      <View style={[s.dot, { backgroundColor: isSel ? t.goldInk : t.ink2 }]} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Legend */}
        <Row style={{ justifyContent: "flex-end", gap: 6, marginTop: space(2) }}>
          <Text style={s.legend}>Less</Text>
          {[0.16, 0.35, 0.55, 0.75].map((a) => (
            <View key={a} style={[s.legendCell, { backgroundColor: withAlpha(t.negative, a) }]} />
          ))}
          <Text style={s.legend}>More</Text>
        </Row>

        {/* Detail: a selected day, or the month summary */}
        {selected !== null ? (
          <View style={{ marginTop: space(4) }}>
            <Row between>
              <Text style={s.detailTitle}>{view.monthName} {selected}</Text>
              {data ? (
                <MoneyText amount={data.days[selected - 1]!.net} signed currency={false} size={15} />
              ) : null}
            </Row>
            {dayTxns.length === 0 ? (
              <Text style={s.empty}>Nothing logged on this day.</Text>
            ) : (
              <Card style={{ paddingVertical: space(1), marginTop: space(2.5) }}>
                {dayTxns.map((tx, i) => (
                  <Pressable
                    key={tx.id}
                    style={[s.txn, i < dayTxns.length - 1 && s.border]}
                    onPress={() => router.push(`/transaction/${tx.id}`)}
                  >
                    <Tico icon={iconForCategory(tx.categoryName, tx.categoryType)} color={tx.categoryColor} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.txnTitle}>{tx.title}</Text>
                      <Text style={s.txnMeta}>{tx.categoryName} · {shortDate(tx.occurredAt)}</Text>
                    </View>
                    <MoneyText amount={tx.signedAmount} signed currency={false} size={14} />
                  </Pressable>
                ))}
              </Card>
            )}
          </View>
        ) : (
          <Card style={{ marginTop: space(4) }}>
            <Row between>
              <View>
                <Text style={s.sumLabel}>Spent</Text>
                {data ? <Text style={[s.sumVal, { color: t.negative }]}>{data.monthSpent.format({ withCode: false })}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.sumLabel}>Income</Text>
                {data ? <Text style={[s.sumVal, { color: t.positive }]}>{data.monthIncome.format({ withCode: false })}</Text> : null}
              </View>
            </Row>
            {data?.busiestDay ? (
              <Text style={s.busiest}>Busiest day · {view.monthName} {data.busiestDay}. Tap any day to see it.</Text>
            ) : (
              <Text style={s.busiest}>Tap any day to see what happened.</Text>
            )}
          </Card>
        )}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
        <PrimaryButton
          label={view.equals(period) ? "Done" : `Show ${view.monthName}`}
          onPress={() => { setPeriod(view); router.back(); }}
        />
      </View>
    </View>
  );
}

const CELL = GRID_W / 7;
const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { paddingHorizontal: space(4), paddingBottom: space(2) },
  cancel: { color: c.gold, fontSize: 15, fontWeight: "600", width: 54 },
  headerTitle: { color: c.ink, fontSize: 16, fontWeight: "800" },
  monthBar: { paddingHorizontal: space(4), paddingVertical: space(2) },
  chev: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" },
  monthLabel: { color: c.ink, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  weekRow: { marginTop: space(2) },
  weekday: { width: CELL, textAlign: "center", color: c.muted, fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL, height: CELL, padding: 3, alignItems: "center", justifyContent: "center" },
  dayBox: { width: "100%", height: "100%", borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 3, borderWidth: 1, borderColor: "transparent" },
  today: { borderColor: c.gold },
  selected: { backgroundColor: c.gold, borderColor: c.gold },
  dayNum: { color: c.ink, fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: { color: c.muted, fontSize: 10 },
  legendCell: { width: 14, height: 14, borderRadius: 4 },
  detailTitle: { color: c.ink, fontSize: 16, fontWeight: "800" },
  empty: { color: c.ink2, fontSize: 13, marginTop: space(2) },
  txn: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  txnTitle: { color: c.ink, fontSize: 14, fontWeight: "600" },
  txnMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
  sumLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  sumVal: { fontSize: 20, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"] },
  busiest: { color: c.ink2, fontSize: 12, marginTop: space(3), lineHeight: 18 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
});
