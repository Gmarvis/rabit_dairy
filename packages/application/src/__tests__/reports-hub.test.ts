import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetCashFlow } from "../queries/GetCashFlow.js";
import { GetSpendingReport } from "../queries/GetSpendingReport.js";
import {
  FixedClock,
  InMemoryAccounts,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  groceriesCategory,
  salaryAccount,
  salaryCategory,
} from "./fakes.js";

function wire() {
  const txns = new InMemoryTransactions();
  const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
  const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
  const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());
  return { txns, categories, accounts, log };
}

const ACC = asAccountId("acc-salary");
const APRIL = YearMonth.of(2026, 4);

describe("GetCashFlow", () => {
  it("returns a trailing N-month series with the period last, and month-over-month change", async () => {
    const { txns, log } = wire();
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 800_000, occurredAt: "2026-04-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 20_000, occurredAt: "2026-04-04T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 10_000, occurredAt: "2026-03-04T00:00:00Z" });

    const view = await new GetCashFlow(txns).execute(USER, APRIL, 6);
    expect(view.months).toHaveLength(6);
    expect(view.months[5]!.label).toBe("Apr");
    expect(view.months[5]!.income.major).toBe(800_000);
    expect(view.months[5]!.net.major).toBe(780_000);
    // April expenses 20k vs March 10k → +100%.
    expect(view.expensesMoM).toBeCloseTo(1);
  });
});

describe("GetSpendingReport", () => {
  it("breaks spending down by category with share + MoM, and lists top spends", async () => {
    const { txns, categories, accounts, log } = wire();
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 20_000, occurredAt: "2026-04-04T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 10_000, occurredAt: "2026-03-04T00:00:00Z" });

    const view = await new GetSpendingReport(txns, categories, accounts).execute(USER, APRIL);
    expect(view.totalExpenses.major).toBe(20_000);
    expect(view.byCategory).toHaveLength(1);
    expect(view.byCategory[0]!.label).toBe("Groceries & Food");
    expect(view.byCategory[0]!.percent).toBeCloseTo(1);
    expect(view.byCategory[0]!.momDelta).toBeCloseTo(1); // 20k vs 10k
    expect(view.byAccount[0]!.label).toBe("Salary account");
    expect(view.topSpends[0]!.amount.major).toBe(20_000);
  });
});
