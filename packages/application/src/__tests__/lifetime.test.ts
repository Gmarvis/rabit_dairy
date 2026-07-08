import { describe, it, expect } from "vitest";
import { asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetLifetime } from "../queries/GetLifetime.js";
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

describe("GetLifetime", () => {
  it("sums earned, spent and net worth across all time, spanning years", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    // Two different years — proving it isn't month/year scoped.
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2025-11-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 30_000, occurredAt: "2025-12-10T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-04-01T00:00:00Z" });

    const view = await new GetLifetime(txns, accounts).execute(USER);

    expect(view.earned.major).toBe(200_000);
    expect(view.spent.major).toBe(30_000);
    expect(view.net.major).toBe(170_000);
    expect(view.transactionCount).toBe(3);
    // Opening 0 + (200k − 30k) movement → net worth 170k.
    expect(view.netWorth.major).toBe(170_000);
    expect(view.since).toBe("2025-11-01T00:00:00Z");
  });
});
