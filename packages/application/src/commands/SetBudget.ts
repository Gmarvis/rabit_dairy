import {
  Budget,
  Money,
  YearMonth,
  asBudgetId,
  fail,
  ok,
  type CategoryId,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type { BudgetRepository } from "../ports/repositories.js";
import type { IdGenerator } from "../ports/services.js";

export interface SetBudgetInput {
  userId: UserId;
  categoryId: CategoryId;
  year: number;
  month: number;
  amountMajor: number;
}

/** Command: set (or update) a category's planned amount for a month. */
export class SetBudget {
  constructor(
    private readonly budgets: BudgetRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: SetBudgetInput): Promise<Result<{ id: string }>> {
    if (input.amountMajor < 0) {
      return fail("amount_invalid", "Budget cannot be negative.");
    }
    const period = YearMonth.of(input.year, input.month);
    const amount = Money.fromMajor(input.amountMajor, "XAF");

    const existing = await this.budgets.findFor(
      input.userId,
      input.categoryId,
      period,
    );
    if (existing) {
      existing.changeAmount(amount);
      await this.budgets.save(existing);
      return ok({ id: existing.id });
    }

    const budget = Budget.create({
      id: asBudgetId(this.ids.next()),
      userId: input.userId,
      categoryId: input.categoryId,
      year: input.year,
      month: input.month,
      amount,
    });
    await this.budgets.save(budget);
    return ok({ id: budget.id });
  }
}
