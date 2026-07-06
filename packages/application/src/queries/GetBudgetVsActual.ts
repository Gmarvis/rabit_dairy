import {
  Money,
  compareBudget,
  sumMoney,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  BudgetRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { BudgetLine, BudgetVsActualView } from "./viewmodels.js";

/** Query: planned vs. spent per category for a period. */
export class GetBudgetVsActual {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly budgets: BudgetRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(
    userId: UserId,
    period: YearMonth,
  ): Promise<BudgetVsActualView> {
    const [periodTxns, budgets, cats] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.budgets.listByPeriod(userId, period),
      this.categories.listAll(userId),
    ]);

    const budgetByCat = new Map(budgets.map((b) => [b.categoryId, b.amount]));

    // Actual spend per expense category.
    const actualByCat = new Map<string, Money>();
    for (const t of periodTxns) {
      if (!t.isExpense) continue;
      const prev = actualByCat.get(t.categoryId) ?? Money.zero("XAF");
      actualByCat.set(t.categoryId, prev.plus(t.amount));
    }

    const lines: BudgetLine[] = cats
      .filter((c) => c.isExpense && !c.isArchived)
      .map((c) => {
        const actual = actualByCat.get(c.id) ?? Money.zero("XAF");
        const budget = budgetByCat.get(c.id) ?? null;
        const cmp = compareBudget(c.id, budget, actual);
        return {
          categoryId: c.id,
          categoryName: c.name,
          categoryColor: c.color,
          budget: cmp.budget,
          actual: cmp.actual,
          variance: cmp.variance,
          percentUsed: cmp.percentUsed,
          status: cmp.status,
        };
      })
      // Show categories with money in play first.
      .filter((l) => !l.budget.isZero || !l.actual.isZero);

    const totalBudget = sumMoney(lines.map((l) => l.budget), "XAF");
    const totalActual = sumMoney(lines.map((l) => l.actual), "XAF");

    return {
      periodLabel: `${period.monthName} ${period.year}`,
      lines,
      totalBudget,
      totalActual,
      overallPercentUsed: totalActual.ratioOf(totalBudget),
    };
  }
}
