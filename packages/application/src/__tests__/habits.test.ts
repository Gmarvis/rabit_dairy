import { describe, it, expect } from "vitest";
import {
  Budget,
  Money,
  YearMonth,
  asAccountId,
  asBudgetId,
  asCategoryId,
  type CategoryId,
  type UserId,
} from "@rabbit/domain";
import type { BudgetRepository } from "../ports/repositories.js";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetHabits } from "../queries/GetHabits.js";
import {
  FixedClock,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  groceriesCategory,
  salaryCategory,
} from "./fakes.js";

class InMemoryBudgets implements BudgetRepository {
  store: Budget[] = [];
  async listByPeriod(_u: UserId, p: YearMonth) {
    return this.store.filter((b) => b.year === p.year && b.month === p.month);
  }
  async findFor(_u: UserId, categoryId: CategoryId, p: YearMonth) {
    return this.store.find((b) => b.categoryId === categoryId && b.year === p.year && b.month === p.month) ?? null;
  }
  async save(b: Budget) {
    this.store.push(b);
  }
}

const ACC = asAccountId("acc-salary");
const SALARY = asCategoryId("cat-salary");
const GROCERIES = asCategoryId("cat-groceries");

function budget(id: string, categoryId: CategoryId, ym: YearMonth, major: number) {
  return Budget.create({
    id: asBudgetId(id),
    userId: USER,
    categoryId,
    year: ym.year,
    month: ym.month,
    amount: Money.fromMajor(major, "XAF"),
  });
}

describe("GetHabits", () => {
  it("computes logging, savings, budget and spend-goal streaks", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const budgets = new InMemoryBudgets();
    const clock = new FixedClock("2026-04-15T12:00:00.000Z");
    const log = new LogTransaction(txns, categories, new SeqIds(), clock);

    // Logging: three consecutive days ending today (Apr 13–15).
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 10_000, occurredAt: "2026-04-15T09:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 6_000, occurredAt: "2026-04-14T09:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 4_000, occurredAt: "2026-04-13T09:00:00Z" });

    // Savings: income in the two completed months (Feb, Mar), nothing before.
    await log.execute({ userId: USER, accountId: ACC, categoryId: SALARY, amountMajor: 100_000, occurredAt: "2026-03-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: SALARY, amountMajor: 100_000, occurredAt: "2026-02-01T00:00:00Z" });

    // Budget on groceries: under in March (30k ≤ 50k), over in Feb (60k > 50k).
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 30_000, occurredAt: "2026-03-05T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 60_000, occurredAt: "2026-02-05T00:00:00Z" });
    budgets.store.push(
      budget("b-apr", GROCERIES, YearMonth.of(2026, 4), 50_000),
      budget("b-mar", GROCERIES, YearMonth.of(2026, 3), 50_000),
      budget("b-feb", GROCERIES, YearMonth.of(2026, 2), 50_000),
    );

    const view = await new GetHabits(txns, budgets, categories, clock).execute(USER);

    // Logging: Apr 13, 14, 15 → current 3, logged today.
    expect(view.logging.current).toBe(3);
    expect(view.logging.loggedToday).toBe(true);
    expect(view.logging.best).toBeGreaterThanOrEqual(3);

    // Savings: Feb + Mar both net-positive → streak 2.
    expect(view.savings.current).toBe(2);

    // Budget: March under (1), February over breaks it.
    expect(view.budget.hasBudget).toBe(true);
    expect(view.budget.current).toBe(1);
    expect(view.budget.thisMonthUnder).toBe(true);

    // Spend goal: groceries goal 50k, 20k spent this month, on track, streak 1.
    expect(view.goals).toHaveLength(1);
    expect(view.goals[0]!.target.major).toBe(50_000);
    expect(view.goals[0]!.spent.major).toBe(20_000);
    expect(view.goals[0]!.onTrack).toBe(true);
    expect(view.goals[0]!.current).toBe(1);
  });
});
