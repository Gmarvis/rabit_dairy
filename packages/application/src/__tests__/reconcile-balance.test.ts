import { describe, it, expect } from "vitest";
import { asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { ReconcileAccountBalance } from "../commands/ReconcileAccountBalance.js";
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

describe("ReconcileAccountBalance", () => {
  it("sets the current balance to a scanned figure, keeping logged transactions", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());

    // +100k in, −30k out → net movement +70k.
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-04-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: asCategoryId("cat-groceries"), amountMajor: 30_000, occurredAt: "2026-04-02T00:00:00Z" });

    const res = await new ReconcileAccountBalance(accounts).execute({
      userId: USER,
      accountId: ACC,
      targetMajor: 200_000,
    });
    expect(res.ok).toBe(true);

    const acc = (await accounts.findById(USER, ACC))!;
    const nm = await accounts.netMovementOf(USER, ACC);
    expect(acc.balance(nm).major).toBe(200_000);
    // Opening absorbed the gap: 200k − 70k = 130k.
    expect(acc.openingBalance.major).toBe(130_000);
  });
});
