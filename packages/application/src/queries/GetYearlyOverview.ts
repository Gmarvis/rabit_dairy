import {
  Money,
  YearMonth,
  summarise,
  type UserId,
} from "@rabbit/domain";
import type { TransactionRepository } from "../ports/repositories.js";
import type { MonthBucket, YearlyOverviewView } from "./viewmodels.js";

/** Query: the 12-month income/expense picture + YTD totals. */
export class GetYearlyOverview {
  constructor(private readonly txns: TransactionRepository) {}

  async execute(userId: UserId, year: number): Promise<YearlyOverviewView> {
    // One period query per month, run concurrently.
    const perMonth = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        this.txns.listByPeriod(userId, YearMonth.of(year, i + 1)),
      ),
    );

    const months: MonthBucket[] = perMonth.map((rows, i) => {
      const s = summarise(rows);
      return {
        month: i + 1,
        monthName: YearMonth.of(year, i + 1).monthName,
        income: s.income,
        expenses: s.expenses,
        savings: s.savings,
        net: s.netBalance,
      };
    });

    const sum = (pick: (m: MonthBucket) => Money) =>
      months.reduce((acc, m) => acc.plus(pick(m)), Money.zero("XAF"));

    const ytdIncome = sum((m) => m.income);
    const ytdExpenses = sum((m) => m.expenses);
    const ytdSavings = sum((m) => m.savings);
    const ytdNet = ytdIncome.minus(ytdExpenses).minus(ytdSavings);

    // Tallest bar across all months (income or expense) to scale the chart.
    const peakMinor = months.reduce(
      (max, m) => Math.max(max, m.income.minor, m.expenses.minor),
      0,
    );

    return {
      year,
      months,
      ytdIncome,
      ytdExpenses,
      ytdSavings,
      ytdNet,
      savingsRate: ytdSavings.ratioOf(ytdIncome),
      peak: Money.of(peakMinor, "XAF"),
    };
  }
}
