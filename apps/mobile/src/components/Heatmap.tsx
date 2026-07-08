import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, Row, SectionLabel, withAlpha } from "./ui";
import { chart, space, type Palette } from "../theme/tokens";

const CELL = 15;
const GAP = 4;
const ROWS = 7; // Sun … Sat
const ROW_LABELS = ["", "M", "", "W", "", "F", ""];

export type HeatmapMode = "good" | "count" | "spent";

function utcKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Discrete alpha bucket for a 0–1 ratio. */
function bucket(r: number): number {
  const x = Math.max(0, Math.min(1, r));
  return x < 0.25 ? 0.24 : x < 0.5 ? 0.42 : x < 0.75 ? 0.62 : 0.85;
}

export interface HeatmapDay {
  key: string;
  date: Date;
  spent: number;
  count: number;
  future: boolean;
}

export interface HeatmapScale {
  spendMax: number;
  countMax: number;
  /** Typical daily spend — the bar for a "good" day. */
  target: number;
}

/** Colour for one day's cell in the given mode — shared with the Home strip. */
export function dayHeatColor(
  mode: HeatmapMode,
  spent: number,
  count: number,
  sc: HeatmapScale,
  c: Palette,
  future = false,
): string {
  if (future) return "transparent";
  if (mode === "spent") {
    return spent <= 0 ? withAlpha(c.negative, 0.07) : withAlpha(c.negative, bucket(spent / (sc.spendMax || 1)));
  }
  if (mode === "count") {
    return count <= 0 ? withAlpha(c.ink2, 0.07) : withAlpha(c.gold, bucket(count / (sc.countMax || 1)));
  }
  // "good" — reward days you tracked AND kept spending at or below your usual.
  if (count === 0) return withAlpha(c.ink2, 0.06); // not tracked → empty nudge
  if (sc.target > 0 && spent <= sc.target) {
    const under = (sc.target - spent) / sc.target; // 0 … 1 (1 = no-spend day)
    return withAlpha(c.positive, bucket(0.3 + 0.7 * under));
  }
  return withAlpha(chart.amber, 0.34); // tracked but over your usual
}

/** True when a day counts toward the "good day" streak. */
export function isGoodDay(spent: number, count: number, target: number): boolean {
  return count > 0 && (target <= 0 ? spent <= 0 : spent <= target);
}

function cellColor(day: HeatmapDay, mode: HeatmapMode, sc: HeatmapScale, c: Palette): string {
  return dayHeatColor(mode, day.spent, day.count, sc, c, day.future);
}

/**
 * A GitHub-style heat-map of daily money behaviour over `weeks` weeks. `mode`
 * decides what the colour means: a "good" day (tracked + under your usual
 * spend), how many entries you logged, or how much you spent.
 */
export function SpendingHeatmap({
  dataByDay,
  scale,
  mode,
  weeks = 16,
  today,
  selectedKey,
  onDayPress,
}: {
  dataByDay: Map<string, { spent: number; count: number }>;
  scale: HeatmapScale;
  mode: HeatmapMode;
  weeks?: number;
  today: Date;
  selectedKey?: string | null;
  onDayPress?: (day: HeatmapDay) => void;
}) {
  const c = useTheme();

  const columns = useMemo(() => {
    const t0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const lastSat = addDays(t0, 6 - t0.getUTCDay());
    const firstSun = addDays(lastSat, -(weeks * ROWS - 1));
    const cols: HeatmapDay[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: HeatmapDay[] = [];
      for (let r = 0; r < ROWS; r++) {
        const date = addDays(firstSun, w * ROWS + r);
        const key = utcKey(date);
        const d = dataByDay.get(key);
        col.push({ key, date, spent: d?.spent ?? 0, count: d?.count ?? 0, future: date.getTime() > t0.getTime() });
      }
      cols.push(col);
    }
    return cols;
  }, [dataByDay, weeks, today]);

  const monthLabels = columns.map((col, i) => {
    const first = col[0]!.date;
    const prev = i > 0 ? columns[i - 1]![0]!.date : null;
    if (i === 0 || (prev && first.getUTCMonth() !== prev.getUTCMonth())) {
      return first.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    }
    return "";
  });

  return (
    <View style={{ flexDirection: "row", marginTop: 8 }}>
      <View style={{ marginRight: 6, marginTop: 16 }}>
        {ROW_LABELS.map((l, i) => (
          <View key={i} style={{ height: CELL + GAP, justifyContent: "center" }}>
            <Text style={{ color: c.muted, fontSize: 9 }}>{l}</Text>
          </View>
        ))}
      </View>
      <View>
        <View style={{ flexDirection: "row", height: 14 }}>
          {monthLabels.map((m, i) => (
            <View key={i} style={{ width: CELL + GAP }}>
              <Text style={{ color: c.muted, fontSize: 9 }} numberOfLines={1}>{m}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row" }}>
          {columns.map((col, w) => (
            <View key={w} style={{ marginRight: GAP }}>
              {col.map((day) => (
                <Pressable
                  key={day.key}
                  disabled={day.future}
                  onPress={() => onDayPress?.(day)}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: cellColor(day, mode, scale, c),
                      borderColor: selectedKey === day.key ? c.ink : "transparent",
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Legend whose colour + labels match the active mode. */
export function HeatmapLegend({ mode }: { mode: HeatmapMode }) {
  const c = useTheme();
  const base = mode === "spent" ? c.negative : mode === "count" ? c.gold : c.positive;
  const [lo, hi] = mode === "good" ? ["Over", "Kept low"] : mode === "count" ? ["Fewer", "More"] : ["Less", "More"];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 10 }}>
      <Text style={{ color: c.muted, fontSize: 10 }}>{lo}</Text>
      {[0.1, 0.24, 0.42, 0.62, 0.85].map((a) => (
        <View key={a} style={[styles.cell, { backgroundColor: withAlpha(base, a) }]} />
      ))}
      <Text style={{ color: c.muted, fontSize: 10 }}>{hi}</Text>
    </View>
  );
}

const HEAT_MODES: { key: HeatmapMode; label: string }[] = [
  { key: "good", label: "Good days" },
  { key: "count", label: "Tracked" },
  { key: "spent", label: "Spending" },
];

function abbrev(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

/**
 * The full heat-map card: a Good days / Tracked / Spending toggle over the
 * grid, a mode-aware legend, and a caption that reflects the tapped day. Shared
 * by Home and Reports so both stay identical.
 */
export function HeatmapCard({
  dataByDay,
  scale,
  today,
  weeks = 16,
  streak,
  initialMode = "good",
}: {
  dataByDay: Map<string, { spent: number; count: number }>;
  scale: HeatmapScale;
  today: Date;
  weeks?: number;
  streak?: number;
  initialMode?: HeatmapMode;
}) {
  const c = useTheme();
  const s = cardStyles(c);
  const [mode, setMode] = useState<HeatmapMode>(initialMode);
  const [day, setDay] = useState<HeatmapDay | null>(null);

  const caption = day
    ? `${day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} · ${day.count === 0 ? "nothing logged" : `${day.count} ${day.count === 1 ? "entry" : "entries"} · ${day.spent > 0 ? `${abbrev(day.spent)} FCFA` : "no spend"}`}`
    : mode === "good"
      ? "Green = you logged and kept spending at or below your usual. Empty = a day you didn't track."
      : mode === "count"
        ? "Darker = more transactions logged that day."
        : "Darker = more spent that day.";

  return (
    <Card>
      <Row between>
        <SectionLabel>Daily heat-map · {weeks} weeks</SectionLabel>
        {streak !== undefined && streak > 0 ? (
          <Row style={{ gap: 5 }}>
            <Ionicons name="leaf" size={13} color={c.positive} />
            <Text style={{ color: c.positive, fontSize: 12, fontWeight: "800" }}>{streak}-day streak</Text>
          </Row>
        ) : null}
      </Row>
      <View style={s.segment}>
        {HEAT_MODES.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => { setMode(m.key); setDay(null); }}
            style={[s.seg, mode === m.key && s.segOn]}
          >
            <Text style={[s.segText, mode === m.key && s.segTextOn]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <SpendingHeatmap
          dataByDay={dataByDay}
          scale={scale}
          mode={mode}
          weeks={weeks}
          today={today}
          selectedKey={day?.key ?? null}
          onDayPress={setDay}
        />
      </ScrollView>
      <HeatmapLegend mode={mode} />
      <Text style={s.caption}>{caption}</Text>
    </Card>
  );
}

const cardStyles = (c: Palette) => StyleSheet.create({
  segment: { flexDirection: "row", backgroundColor: c.card2, borderColor: c.line, borderWidth: 1, borderRadius: 13, padding: 3, marginTop: space(2.5) },
  seg: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space(2), borderRadius: 10 },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 13, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  caption: { color: c.ink2, fontSize: 12, marginTop: 10, lineHeight: 17 },
});

const styles = StyleSheet.create({
  cell: { width: CELL, height: CELL, borderRadius: 3, marginBottom: GAP, borderWidth: 1 },
});
