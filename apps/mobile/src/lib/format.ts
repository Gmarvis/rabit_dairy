/** Short day label like "Sat · Apr 4". */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  return `${wd} · ${mo} ${d.getUTCDate()}`;
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
