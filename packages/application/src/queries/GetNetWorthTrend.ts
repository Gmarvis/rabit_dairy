import { Money, YearMonth, type UserId } from "@rabbit/domain";
import type {
  AccountRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { NetWorthTrendView } from "./viewmodels.js";

/**
 * Query: total net worth at the end of each of the last N months, ending at
 * the selected period. The last point equals the live total shown on Home; we
 * walk backwards from it, removing each month's movement to reach the previous
 * month-end.
 */
export class GetNetWorthTrend {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(
    userId: UserId,
    period: YearMonth,
    months = 6,
  ): Promise<NetWorthTrendView> {
    const accs = await this.accounts.listAll(userId);
    const dormant = new Set(accs.filter((a) => a.isDormant).map((a) => a.id));

    const movements = await Promise.all(
      accs.map((a) => this.accounts.netMovementOf(userId, a.id)),
    );
    const current = accs.reduce(
      (sum, a, i) => (a.isDormant ? sum : sum.plus(a.netWorthContribution(movements[i]!))),
      Money.zero("XAF"),
    );

    // Trailing window of periods, oldest → newest.
    const periods: YearMonth[] = [];
    let p = period;
    for (let i = 0; i < months; i++) {
      periods.unshift(p);
      p = p.previous();
    }

    // Signed movement across non-dormant accounts, per month.
    const monthMovement = await Promise.all(
      periods.map(async (ym) => {
        const rows = await this.txns.listByPeriod(userId, ym);
        return rows
          .filter((t) => !dormant.has(t.accountId))
          .reduce((sum, t) => sum.plus(t.signedAmount), Money.zero("XAF"));
      }),
    );

    // End-of-month net worth: latest = current; each earlier month removes the
    // later month's movement.
    const values: Money[] = new Array(months);
    values[months - 1] = current;
    for (let i = months - 1; i > 0; i--) {
      values[i - 1] = values[i]!.minus(monthMovement[i]!);
    }

    const points = periods.map((ym, i) => ({
      label: ym.monthName.slice(0, 3),
      value: values[i]!,
    }));

    const first = points[0]!.value;
    const change = current.minus(first);

    return {
      points,
      current,
      change,
      changePct: first.isZero ? null : change.ratioOf(first),
      min: Math.min(...values.map((v) => v.minor)),
      max: Math.max(...values.map((v) => v.minor)),
    };
  }
}
