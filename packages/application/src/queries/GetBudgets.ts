import type { Category, UserId, YearMonth } from "@rabbit/domain";
import type {
  BudgetRepository,
  CategoryRepository,
} from "../ports/repositories.js";
import type { BudgetEditorItem, BudgetEditorView } from "./viewmodels.js";

/** Query: current budget amount per category for a period (for the editor). */
export class GetBudgets {
  constructor(
    private readonly budgets: BudgetRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(userId: UserId, period: YearMonth): Promise<BudgetEditorView> {
    const [budgets, cats] = await Promise.all([
      this.budgets.listByPeriod(userId, period),
      this.categories.listAll(userId),
    ]);
    const amountByCat = new Map(
      budgets.map((b) => [b.categoryId, b.amount.major]),
    );

    const items: BudgetEditorItem[] = cats
      .filter((c: Category) => !c.isArchived && c.type !== "income")
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        color: c.color,
        type: c.type,
        amountMajor: amountByCat.get(c.id) ?? 0,
      }));

    return { periodLabel: `${period.monthName} ${period.year}`, items };
  }
}
