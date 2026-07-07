import { describe, it, expect } from "vitest";
import { asAccountId, asCategoryId } from "@rabbit/domain";
import { GetExportRows } from "../queries/GetExportRows.js";
import { LogTransaction } from "../commands/LogTransaction.js";
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

describe("GetExportRows", () => {
  it("returns flat, date-sorted rows with resolved names", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    await log.execute({ userId: USER, accountId: asAccountId("acc-salary"), categoryId: asCategoryId("cat-groceries"), amountMajor: 11_200, occurredAt: "2026-04-05T00:00:00Z", description: "Market" });
    await log.execute({ userId: USER, accountId: asAccountId("acc-salary"), categoryId: asCategoryId("cat-salary"), amountMajor: 811_821, occurredAt: "2026-04-01T00:00:00Z" });

    const rows = await new GetExportRows(txns, categories, accounts).execute(USER, 2026);
    expect(rows).toHaveLength(2);
    // sorted oldest-first
    expect(rows[0]!.date).toBe("2026-04-01");
    expect(rows[0]!.category).toBe("Salary (Net)");
    expect(rows[0]!.direction).toBe("in");
    expect(rows[1]!.category).toBe("Groceries & Food");
    expect(rows[1]!.account).toBe("Salary account");
    expect(rows[1]!.amountMajor).toBe(11_200);
  });
});
