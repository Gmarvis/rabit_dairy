import {
  Money,
  summarise,
  type Category,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { CategorySlice, MonthlyReportView } from "./viewmodels.js";

/** Query: where the money went this month — breakdown by category + top 5. */
export class GetMonthlyReport {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(
    userId: UserId,
    period: YearMonth,
  ): Promise<MonthlyReportView> {
    const [rows, cats] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.categories.listAll(userId),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));

    const summary = summarise(rows);

    // Total expenses per category.
    const totals = new Map<string, Money>();
    for (const t of rows) {
      if (!t.isExpense) continue;
      totals.set(
        t.categoryId,
        (totals.get(t.categoryId) ?? Money.zero("XAF")).plus(t.amount),
      );
    }

    const byCategory: CategorySlice[] = [...totals.entries()]
      .map(([categoryId, amount]) => {
        const cat = catById.get(categoryId);
        return {
          categoryName: cat?.name ?? "—",
          color: cat?.color ?? "#888888",
          amount,
          percentOfExpenses: amount.ratioOf(summary.expenses),
        };
      })
      .sort((a, b) => b.amount.minor - a.amount.minor);

    return {
      periodLabel: `${period.monthName} ${period.year}`,
      summary,
      byCategory,
      topExpenses: byCategory.slice(0, 5),
    };
  }
}
