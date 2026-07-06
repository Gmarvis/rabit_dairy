import { Money } from "../shared/Money.js";
import type { YearMonth } from "../shared/YearMonth.js";
import type { BudgetId, CategoryId, UserId } from "../shared/ids.js";

export interface BudgetProps {
  id: BudgetId;
  userId: UserId;
  categoryId: CategoryId;
  year: number;
  month: number;
  amount: Money;
}

/** A planned cap for one category in one month. */
export class Budget {
  private constructor(private props: BudgetProps) {}

  static create(props: BudgetProps): Budget {
    if (props.amount.isNegative) throw new Error("Budget cannot be negative");
    return new Budget({ ...props });
  }

  get id() { return this.props.id; }
  get categoryId() { return this.props.categoryId; }
  get year() { return this.props.year; }
  get month() { return this.props.month; }
  get amount() { return this.props.amount; }

  changeAmount(amount: Money): void {
    if (amount.isNegative) throw new Error("Budget cannot be negative");
    this.props.amount = amount;
  }

  snapshot(): Readonly<BudgetProps> { return { ...this.props }; }
}

export interface BudgetVsActual {
  categoryId: CategoryId;
  budget: Money;
  actual: Money;
  /** budget − actual: positive means under budget, negative means over. */
  variance: Money;
  /** actual / budget (0 when no budget is set). */
  percentUsed: number;
  status: "under" | "at" | "over" | "no_budget";
}

/** Compare a category's planned amount against what was actually spent. */
export function compareBudget(
  categoryId: CategoryId,
  budget: Money | null,
  actual: Money,
): BudgetVsActual {
  if (budget === null || budget.isZero) {
    return {
      categoryId,
      budget: Money.zero(actual.currency),
      actual,
      variance: actual.negated(),
      percentUsed: actual.isZero ? 0 : 1,
      status: actual.isZero ? "no_budget" : "over",
    };
  }
  const variance = budget.minus(actual);
  const percentUsed = actual.ratioOf(budget);
  const status: BudgetVsActual["status"] =
    percentUsed > 1 ? "over" : percentUsed === 1 ? "at" : "under";
  return { categoryId, budget, actual, variance, percentUsed, status };
}
