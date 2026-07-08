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
import { GetNudges } from "../queries/GetNudges.js";
import {
  FixedClock,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  groceriesCategory,
  salaryAccount,
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
  async save(b: Budget) { this.store.push(b); }
}

const ACC = asAccountId("acc-salary");
const GROCERIES = asCategoryId("cat-groceries");
const APRIL = YearMonth.of(2026, 4);

describe("GetNudges", () => {
  it("flags over-budget, above-usual, and month-over-month spikes", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const budgets = new InMemoryBudgets();
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    // Groceries ~10k/month for the three prior months, then 30k in April.
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 10_000, occurredAt: "2026-01-05T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 10_000, occurredAt: "2026-02-05T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 10_000, occurredAt: "2026-03-05T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 30_000, occurredAt: "2026-04-05T00:00:00Z" });
    budgets.store.push(
      Budget.create({ id: asBudgetId("b1"), userId: USER, categoryId: GROCERIES, year: 2026, month: 4, amount: Money.fromMajor(15_000, "XAF") }),
    );

    const view = await new GetNudges(txns, budgets, categories).execute(USER, APRIL);
    const kinds = view.items.map((n) => n.kind);

    expect(kinds).toContain("over_budget");
    expect(kinds).toContain("overspend_category");
    expect(kinds).toContain("spending_up");
    // Over budget is the most severe, so it ranks first.
    expect(view.items[0]!.kind).toBe("over_budget");
    expect(view.items[0]!.title).toContain("Groceries");
  });

  it("returns a reassuring note when spending eased and there is data", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const budgets = new InMemoryBudgets();
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 20_000, occurredAt: "2026-03-05T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 8_000, occurredAt: "2026-04-05T00:00:00Z" });

    const view = await new GetNudges(txns, budgets, categories).execute(USER, APRIL);
    expect(view.items[0]!.kind).toBe("on_track");
    expect(view.items[0]!.tone).toBe("positive");
  });
});
