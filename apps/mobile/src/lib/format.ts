import dayjs from "dayjs";
import type { YearMonth } from "@rabbit/domain";

/** Short day label like "Sat · 4 Apr". */
export function dayLabel(iso: string): string {
  return dayjs(iso).format("ddd · D MMM");
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
