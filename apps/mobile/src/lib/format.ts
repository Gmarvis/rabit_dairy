import dayjs from "dayjs";
import type { YearMonth } from "@rabbit/domain";

/** Short day label like "Sat · 4 Apr". */
export function dayLabel(iso: string): string {
  return dayjs(iso).format("ddd · D MMM");
}

/** Compact date like "Apr 4" for list-row meta. */
export function shortDate(iso: string): string {
  return dayjs(iso).format("MMM D");
}

/** Full date like "Apr 3, 2026" for detail rows. */
export function fullDate(iso: string): string {
  return dayjs(iso).format("MMM D, YYYY");
}

/** Uppercase day header like "SAT · APR 4". */
export function dayHeader(iso: string): string {
  return dayjs(iso).format("ddd · MMM D").toUpperCase();
}

/** Time-of-day greeting. */
export function greeting(): string {
  const h = dayjs().hour();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "July 2026" for a period. */
export function monthLabel(period: YearMonth): string {
  return `${period.monthName} ${period.year}`;
}

export function percent(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_card: "Bank Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};
export const methodLabel = (m: string | null): string =>
  m ? METHOD_LABELS[m] ?? m : "";

/**
 * Prepare values for a gifted-charts area/line sparkline. The library fills the
 * area down to the zero baseline, so negative data (e.g. a negative net worth)
 * stretches the fill far past the chart's `height`. This offsets the series
 * into a positive band (shape is all a sparkline conveys) and returns the
 * matching `maxValue`; each point keeps its original figure on `real` for
 * tooltips, plus any other fields (label, etc.).
 */
export function sparkSeries<T extends { value: number }>(
  points: T[],
): { data: (T & { real: number })[]; maxValue: number } {
  const raw = points.map((p) => p.value);
  const min = raw.length ? Math.min(...raw) : 0;
  const max = raw.length ? Math.max(...raw) : 0;
  const pad = (max - min || Math.abs(max) || 1) * 0.15;
  const data = points.map((p) => ({ ...p, real: p.value, value: p.value - min + pad }));
  return { data, maxValue: max - min + pad * 2 };
}

/** Compact number for chart axes / tight labels: 1_200 → "1k", 3_400_000 → "3.4M". */
export function abbrev(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}
