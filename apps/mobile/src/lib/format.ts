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
