import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { withAlpha } from "./ui";
import type { Palette } from "../theme/tokens";

const CELL = 15;
const GAP = 4;
const ROWS = 7; // Sun … Sat
const ROW_LABELS = ["", "M", "", "W", "", "F", ""];

function utcKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Discrete heat bucket (0 = none) → background colour. */
function heatColor(spent: number, max: number, c: Palette): string {
  if (spent <= 0) return withAlpha(c.negative, 0.07);
  const r = max > 0 ? spent / max : 0;
  const a = r < 0.25 ? 0.24 : r < 0.5 ? 0.42 : r < 0.75 ? 0.62 : 0.85;
  return withAlpha(c.negative, a);
}

export interface HeatmapDay {
  key: string;
  date: Date;
  spent: number;
  future: boolean;
}

/**
 * A GitHub-style heat-map of daily spending: `weeks` columns of 7 day-cells,
 * each tinted by how much was spent that day. Tapping a cell reports the day.
 */
export function SpendingHeatmap({
  spentByDay,
  maxSpent,
  weeks = 16,
  today,
  selectedKey,
  onDayPress,
}: {
  spentByDay: Map<string, number>;
  maxSpent: number;
  weeks?: number;
  today: Date;
  selectedKey?: string | null;
  onDayPress?: (day: HeatmapDay) => void;
}) {
  const c = useTheme();

  const columns = useMemo(() => {
    const t0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    // Saturday that ends this week, then walk back to the first Sunday.
    const lastSat = addDays(t0, 6 - t0.getUTCDay());
    const firstSun = addDays(lastSat, -(weeks * ROWS - 1));
    const cols: HeatmapDay[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: HeatmapDay[] = [];
      for (let r = 0; r < ROWS; r++) {
        const date = addDays(firstSun, w * ROWS + r);
        const key = utcKey(date);
        col.push({ key, date, spent: spentByDay.get(key) ?? 0, future: date.getTime() > t0.getTime() });
      }
      cols.push(col);
    }
    return cols;
  }, [spentByDay, weeks, today]);

  // Month labels above the columns where a new month starts.
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
      {/* weekday labels */}
      <View style={{ marginRight: 6, marginTop: 16 }}>
        {ROW_LABELS.map((l, i) => (
          <View key={i} style={{ height: CELL + GAP, justifyContent: "center" }}>
            <Text style={{ color: c.muted, fontSize: 9 }}>{l}</Text>
          </View>
        ))}
      </View>
      <View>
        {/* month labels */}
        <View style={{ flexDirection: "row", height: 14 }}>
          {monthLabels.map((m, i) => (
            <View key={i} style={{ width: CELL + GAP }}>
              <Text style={{ color: c.muted, fontSize: 9 }} numberOfLines={1}>{m}</Text>
            </View>
          ))}
        </View>
        {/* grid */}
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
                      backgroundColor: day.future ? "transparent" : heatColor(day.spent, maxSpent, c),
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

/** Less → More legend swatches. */
export function HeatmapLegend() {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 10 }}>
      <Text style={{ color: c.muted, fontSize: 10 }}>Less</Text>
      {[0.07, 0.24, 0.42, 0.62, 0.85].map((a) => (
        <View key={a} style={[styles.cell, { backgroundColor: withAlpha(c.negative, a) }]} />
      ))}
      <Text style={{ color: c.muted, fontSize: 10 }}>More</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { width: CELL, height: CELL, borderRadius: 3, marginBottom: GAP, borderWidth: 1 },
});
