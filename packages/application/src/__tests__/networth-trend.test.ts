import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetNetWorthTrend } from "../queries/GetNetWorthTrend.js";
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

const ACC = asAccountId("acc-salary");
const APRIL = YearMonth.of(2026, 4);

describe("GetNetWorthTrend", () => {
  it("ends at the live total and walks back one month's movement per step", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    // March: +100k income. April: +100k income, −30k groceries → net +70k.
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-03-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-04-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 30_000, occurredAt: "2026-04-04T00:00:00Z" });

    const view = await new GetNetWorthTrend(txns, accounts).execute(USER, APRIL, 6);

    expect(view.points).toHaveLength(6);
    expect(view.points[5]!.label).toBe("Apr");
    // Live total = 100k + 70k = 170k, and the last point matches it.
    expect(view.current.major).toBe(170_000);
    expect(view.points[5]!.value.major).toBe(170_000);
    // End of March = 100k (April's +70k removed).
    expect(view.points[4]!.value.major).toBe(100_000);
    // End of February and earlier = 0 (nothing had happened yet).
    expect(view.points[3]!.value.major).toBe(0);
    // Whole-window change = 170k up from a zero start.
    expect(view.change.major).toBe(170_000);
  });
});
