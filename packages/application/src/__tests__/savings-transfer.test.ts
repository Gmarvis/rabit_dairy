import { describe, it, expect } from "vitest";
import {
  Account,
  Money,
  asAccountId,
  asCategoryId,
} from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { RecordTransfer } from "../commands/RecordTransfer.js";
import { GetLifetime } from "../queries/GetLifetime.js";
import {
  FixedClock,
  InMemoryAccounts,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  salaryAccount,
  salaryCategory,
} from "./fakes.js";

const SALARY = asAccountId("acc-salary");
const SAVINGS = asAccountId("acc-savings");

function savingsAccount() {
  return Account.create({
    id: SAVINGS,
    userId: USER,
    name: "Savings",
    type: "bank_savings",
    role: "savings",
    currency: "XAF",
    institution: "UBA",
    mask: "7130",
    openingBalance: Money.zero("XAF"),
    isPrimary: false,
    isDormant: false,
  });
}

describe("RecordTransfer between accounts", () => {
  it("moves money so net worth is unchanged and the savings balance counts as saved", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount()).seed(savingsAccount());
    const clock = new FixedClock();
    const log = new LogTransaction(txns, categories, new SeqIds(), clock);
    const transfer = new RecordTransfer(txns, categories, new SeqIds(), clock);

    // Earn 100k, then move 30k from salary into savings.
    await log.execute({ userId: USER, accountId: SALARY, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-04-01T00:00:00Z" });
    const res = await transfer.execute({
      userId: USER,
      fromAccountId: SALARY,
      toAccountId: SAVINGS,
      amountMajor: 30_000,
      occurredAt: "2026-04-05T00:00:00Z",
    });
    expect(res.ok).toBe(true);

    const view = await new GetLifetime(txns, accounts).execute(USER);
    // Earned 100k, spent nothing → accumulated 100k.
    expect(view.earned.major).toBe(100_000);
    expect(view.net.major).toBe(100_000);
    // The savings balance (money moved in) is what "saved" measures…
    expect(view.saved.major).toBe(30_000);
    // …and the move doesn't change net worth (salary 70k + savings 30k).
    expect(view.netWorth.major).toBe(100_000);
  });

  it("rejects moving money to the same account", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories();
    const cmd = new RecordTransfer(txns, categories, new SeqIds(), new FixedClock());
    const res = await cmd.execute({
      userId: USER,
      fromAccountId: SAVINGS,
      toAccountId: SAVINGS,
      amountMajor: 10_000,
    });
    expect(res.ok).toBe(false);
  });
});
