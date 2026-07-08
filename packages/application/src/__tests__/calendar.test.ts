import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetCalendar } from "../queries/GetCalendar.js";
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

describe("GetCalendar", () => {
  it("lays out a month's spend day-by-day with heat scaling and the busiest day", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-04-01T09:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 20_000, occurredAt: "2026-04-04T09:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 5_000, occurredAt: "2026-04-04T18:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 30_000, occurredAt: "2026-04-10T09:00:00Z" });

    const view = await new GetCalendar(txns, categories, accounts).execute(USER, APRIL);

    expect(view.days).toHaveLength(30); // April
    expect(view.transactions).toHaveLength(4);
    expect(view.days[0]!.income.major).toBe(100_000); // Apr 1
    expect(view.days[3]!.spent.major).toBe(25_000); // Apr 4 = 20k + 5k
    expect(view.days[3]!.count).toBe(2);
    expect(view.maxSpent).toBe(30_000_00 / 100); // 30k in minor units
    expect(view.busiestDay).toBe(10);
    expect(view.monthSpent.major).toBe(55_000);
  });
});
