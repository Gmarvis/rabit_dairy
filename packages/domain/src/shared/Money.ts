/**
 * Money — immutable value object.
 *
 * Stored as an integer number of *minor units*. XAF (FCFA) has no minor unit
 * (no centimes in circulation), so `decimals` is 0 and one unit = one franc.
 * Keeping money as integers avoids floating-point drift on sums.
 */

export type CurrencyCode = "XAF" | "USD" | "EUR" | "NGN";

const DECIMALS: Record<CurrencyCode, number> = {
  XAF: 0,
  USD: 2,
  EUR: 2,
  NGN: 2,
};

export class Money {
  private constructor(
    /** Integer amount in minor units (francs for XAF). */
    readonly minor: number,
    readonly currency: CurrencyCode,
  ) {}

  static of(minor: number, currency: CurrencyCode = "XAF"): Money {
    if (!Number.isInteger(minor)) {
      throw new Error(`Money.minor must be an integer, got ${minor}`);
    }
    return new Money(minor, currency);
  }

  /** Build from a major-unit value (e.g. 811_821 francs, or 12.50 USD). */
  static fromMajor(major: number, currency: CurrencyCode = "XAF"): Money {
    const factor = 10 ** DECIMALS[currency];
    return new Money(Math.round(major * factor), currency);
  }

  static zero(currency: CurrencyCode = "XAF"): Money {
    return new Money(0, currency);
  }

  get decimals(): number {
    return DECIMALS[this.currency];
  }

  /** Value in major units (francs, dollars…). */
  get major(): number {
    return this.minor / 10 ** this.decimals;
  }

  get isZero(): boolean {
    return this.minor === 0;
  }

  get isNegative(): boolean {
    return this.minor < 0;
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new Error(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minor + other.minor, this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minor - other.minor, this.currency);
  }

  negated(): Money {
    return new Money(-this.minor, this.currency);
  }

  abs(): Money {
    return new Money(Math.abs(this.minor), this.currency);
  }

  compareTo(other: Money): number {
    this.assertSameCurrency(other);
    return this.minor - other.minor;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minor === other.minor;
  }

  /** Ratio of this to another amount (0 when the base is zero). */
  ratioOf(base: Money): number {
    this.assertSameCurrency(base);
    return base.minor === 0 ? 0 : this.minor / base.minor;
  }

  /** Localised string, e.g. "811,821 FCFA". */
  format(opts: { withCode?: boolean } = {}): string {
    const n = this.major.toLocaleString("en-US", {
      minimumFractionDigits: this.decimals,
      maximumFractionDigits: this.decimals,
    });
    if (opts.withCode === false) return n;
    return this.currency === "XAF" ? `${n} FCFA` : `${n} ${this.currency}`;
  }

  toJSON() {
    return { minor: this.minor, currency: this.currency };
  }
}

/** Sum a list of same-currency Money; empty list yields zero in `currency`. */
export function sumMoney(
  items: readonly Money[],
  currency: CurrencyCode = "XAF",
): Money {
  return items.reduce((acc, m) => acc.plus(m), Money.zero(currency));
}
