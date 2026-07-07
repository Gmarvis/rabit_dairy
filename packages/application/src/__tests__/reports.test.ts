import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetMonthlyReport } from "../queries/GetMonthlyReport.js";
import { GetYearlyOverview } from "../queries/GetYearlyOverview.js";
import {
  FixedClock,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  groceriesCategory,
  salaryCategory,
} from "./fakes.js";

function wire() {
  const txns = new InMemoryTransactions();
  const categories = new InMemoryCategories()
    .seed(salaryCategory())
    .seed(groceriesCategory());
  const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());
  return { txns, categories, log };
}

const ACC = asAccountId("acc-salary");
const GROCERIES = asCategoryId("cat-groceries");
const SALARY = asCategoryId("cat-salary");

describe("GetMonthlyReport", () => {
  it("breaks expenses down by category with % of expenses", async () => {
    const { txns, categories, log } = wire();
    await log.execute({ userId: USER, accountId: ACC, categoryId: SALARY, amountMajor: 800_000, occurredAt: "2026-04-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 30_000, occurredAt: "2026-04-05T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 10_000, occurredAt: "2026-04-06T00:00:00Z" });

    const report = await new GetMonthlyReport(txns, categories).execute(USER, YearMonth.of(2026, 4));
    expect(report.summary.income.major).toBe(800_000);
    expect(report.summary.expenses.major).toBe(40_000);
    // Only expense categories appear; income is excluded.
    expect(report.byCategory).toHaveLength(1);
    expect(report.byCategory[0]!.categoryName).toBe("Groceries & Food");
    expect(report.byCategory[0]!.amount.major).toBe(40_000);
    expect(report.byCategory[0]!.percentOfExpenses).toBeCloseTo(1, 5);
  });
});

describe("GetYearlyOverview", () => {
  it("buckets by month and totals YTD", async () => {
    const { txns, categories, log } = wire();
    await log.execute({ userId: USER, accountId: ACC, categoryId: SALARY, amountMajor: 800_000, occurredAt: "2026-03-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 50_000, occurredAt: "2026-04-10T00:00:00Z" });

    const y = await new GetYearlyOverview(txns).execute(USER, 2026);
    expect(y.months).toHaveLength(12);
    expect(y.months[2]!.income.major).toBe(800_000); // March
    expect(y.months[3]!.expenses.major).toBe(50_000); // April
    expect(y.ytdIncome.major).toBe(800_000);
    expect(y.ytdExpenses.major).toBe(50_000);
    expect(y.peak.major).toBe(800_000);
  });
});
