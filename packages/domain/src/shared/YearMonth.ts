/**
 * YearMonth — the accounting period used across budgets and reports. Mirrors
 * the spreadsheet's "Active Month". Month is 1–12.
 */
export class YearMonth {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  static of(year: number, month: number): YearMonth {
    if (month < 1 || month > 12 || !Number.isInteger(month)) {
      throw new Error(`Invalid month: ${month}`);
    }
    if (!Number.isInteger(year)) throw new Error(`Invalid year: ${year}`);
    return new YearMonth(year, month);
  }

  /** Parse "YYYY-MM". */
  static parse(s: string): YearMonth {
    const [y, m] = s.split("-").map(Number);
    return YearMonth.of(y!, m!);
  }

  static fromDate(d: Date): YearMonth {
    return YearMonth.of(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }

  /** ISO date (UTC) of an ISO datetime string belongs to this period? */
  containsIso(isoDate: string): boolean {
    return this.equals(YearMonth.fromDate(new Date(isoDate)));
  }

  previous(): YearMonth {
    return this.month === 1
      ? YearMonth.of(this.year - 1, 12)
      : YearMonth.of(this.year, this.month - 1);
  }

  next(): YearMonth {
    return this.month === 12
      ? YearMonth.of(this.year + 1, 1)
      : YearMonth.of(this.year, this.month + 1);
  }

  equals(o: YearMonth): boolean {
    return o.year === this.year && o.month === this.month;
  }

  /** "2026-04" */
  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, "0")}`;
  }

  get monthName(): string {
    return [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ][this.month - 1]!;
  }
}
