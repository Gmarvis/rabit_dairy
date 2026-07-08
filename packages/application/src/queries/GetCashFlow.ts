import { Money, YearMonth, summarise, type UserId } from "@rabbit/domain";
import type { TransactionRepository } from "../ports/repositories.js";
import type { CashFlowMonth, CashFlowView } from "./viewmodels.js";

/** Query: income vs expenses vs net over the last N months, newest last. */
export class GetCashFlow {
  constructor(private readonly txns: TransactionRepository) {}

  async execute(
    userId: UserId,
    period: YearMonth,
    months = 6,
  ): Promise<CashFlowView> {
    // Build the trailing window of periods, oldest → newest.
    const periods: YearMonth[] = [];
    let p = period;
    for (let i = 0; i < months; i++) {
      periods.unshift(p);
      p = p.previous();
    }

    const perMonth = await Promise.all(
      periods.map((ym) => this.txns.listByPeriod(userId, ym)),
    );

    const series: CashFlowMonth[] = perMonth.map((rows, i) => {
      const s = summarise(rows);
      return {
        month: periods[i]!.month,
        label: periods[i]!.monthName.slice(0, 3),
        income: s.income,
        expenses: s.expenses,
        net: s.income.minus(s.expenses),
        savingsRate: s.savingsRate,
      };
    });

    const sum = (pick: (m: CashFlowMonth) => Money) =>
      series.reduce((acc, m) => acc.plus(pick(m)), Money.zero("XAF"));
    const totalIncome = sum((m) => m.income);
    const totalExpenses = sum((m) => m.expenses);

    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const mom = (pick: (m: CashFlowMonth) => Money): number | null => {
      if (!last || !prev || pick(prev).isZero) return null;
      return pick(last).minus(pick(prev)).ratioOf(pick(prev));
    };

    const peakMinor = series.reduce(
      (max, m) => Math.max(max, m.income.minor, m.expenses.minor),
      0,
    );

    return {
      months: series,
      totalIncome,
      totalExpenses,
      totalNet: totalIncome.minus(totalExpenses),
      savingsRate: last?.savingsRate ?? 0,
      incomeMoM: mom((m) => m.income),
      expensesMoM: mom((m) => m.expenses),
      peak: Money.of(peakMinor, "XAF"),
    };
  }
}
