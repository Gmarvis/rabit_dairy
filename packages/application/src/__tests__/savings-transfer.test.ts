import { describe, it, expect } from "vitest";
import {
  Account,
  Category,
  Money,
  asAccountId,
  asCategoryId,
} from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { RecordSavingsMovement } from "../commands/RecordSavingsMovement.js";
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
    currency: "XAF",
    institution: "UBA",
    mask: "7130",
    openingBalance: Money.zero("XAF"),
    isPrimary: false,
    isDormant: false,
  });
}
function savingsCategory() {
  return Category.create({
    id: asCategoryId("cat-savings"),
    userId: USER,
    name: "Emergency Fund",
    type: "savings",
    color: "#4E8FD9",
    defaultPaymentMethod: "bank_transfer",
    isArchived: false,
  });
}

describe("RecordSavingsMovement as a transfer", () => {
  it("moves money between accounts so net worth stays equal to what was accumulated", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(savingsCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount()).seed(savingsAccount());
    const clock = new FixedClock();
    const log = new LogTransaction(txns, categories, new SeqIds(), clock);
    const saveMove = new RecordSavingsMovement(txns, new SeqIds(), clock);

    // Earn 100k, then move 30k into savings.
    await log.execute({ userId: USER, accountId: SALARY, categoryId: asCategoryId("cat-salary"), amountMajor: 100_000, occurredAt: "2026-04-01T00:00:00Z" });
    const res = await saveMove.execute({
      userId: USER,
      savingsAccountId: SAVINGS,
      fundingAccountId: SALARY,
      savingsCategoryId: asCategoryId("cat-savings"),
      kind: "deposit",
      amountMajor: 30_000,
      occurredAt: "2026-04-05T00:00:00Z",
    });
    expect(res.ok).toBe(true);

    const view = await new GetLifetime(txns, accounts).execute(USER);
    // Earned 100k, spent nothing → accumulated 100k.
    expect(view.earned.major).toBe(100_000);
    expect(view.net.major).toBe(100_000);
    // The move is counted as saved, but doesn't reduce net worth…
    expect(view.saved.major).toBe(30_000);
    // …net worth (salary 70k + savings 30k) reconciles with accumulated.
    expect(view.netWorth.major).toBe(100_000);
  });

  it("rejects moving money to the same account", async () => {
    const txns = new InMemoryTransactions();
    const cmd = new RecordSavingsMovement(txns, new SeqIds(), new FixedClock());
    const res = await cmd.execute({
      userId: USER,
      savingsAccountId: SAVINGS,
      fundingAccountId: SAVINGS,
      savingsCategoryId: asCategoryId("cat-savings"),
      kind: "deposit",
      amountMajor: 10_000,
    });
    expect(res.ok).toBe(false);
  });
});
