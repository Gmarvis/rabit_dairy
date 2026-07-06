import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetDashboard } from "../queries/GetDashboard.js";
import { GetAccountsOverview } from "../queries/GetAccountsOverview.js";
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
  const categories = new InMemoryCategories()
    .seed(salaryCategory())
    .seed(groceriesCategory());
  const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
  const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());
  return { txns, categories, accounts, log };
}

describe("LogTransaction", () => {
  it("defaults income to direction 'in' and denormalises the category type", async () => {
    const { log, txns } = wire();
    const res = await log.execute({
      userId: USER,
      accountId: asAccountId("acc-salary"),
      categoryId: asCategoryId("cat-salary"),
      amountMajor: 811_821,
      occurredAt: "2026-04-01T00:00:00Z",
    });
    expect(res.ok).toBe(true);
    const saved = [...txns.store.values()][0]!;
    expect(saved.direction).toBe("in");
    expect(saved.categoryType).toBe("income");
    expect(saved.signedAmount.major).toBe(811_821);
  });

  it("rejects a zero amount", async () => {
    const { log } = wire();
    const res = await log.execute({
      userId: USER,
      accountId: asAccountId("acc-salary"),
      categoryId: asCategoryId("cat-salary"),
      amountMajor: 0,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("amount_invalid");
  });

  it("rejects an unknown category", async () => {
    const { log } = wire();
    const res = await log.execute({
      userId: USER,
      accountId: asAccountId("acc-salary"),
      categoryId: asCategoryId("nope"),
      amountMajor: 100,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("category_not_found");
  });
});

describe("Dashboard + Accounts reflect logged transactions", () => {
  it("computes the April net balance and account balance", async () => {
    const { log, txns, categories, accounts } = wire();
    const acc = asAccountId("acc-salary");
    await log.execute({ userId: USER, accountId: acc, categoryId: asCategoryId("cat-salary"), amountMajor: 811_821, occurredAt: "2026-04-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: acc, categoryId: asCategoryId("cat-groceries"), amountMajor: 11_200, occurredAt: "2026-04-04T00:00:00Z" });

    const dash = await new GetDashboard(txns, categories, accounts).execute(
      USER,
      YearMonth.of(2026, 4),
    );
    expect(dash.summary.income.major).toBe(811_821);
    expect(dash.summary.expenses.major).toBe(11_200);
    expect(dash.summary.netBalance.major).toBe(800_621);
    expect(dash.recent).toHaveLength(2);

    const overview = await new GetAccountsOverview(accounts).execute(USER);
    expect(overview.totalBalance.major).toBe(800_621);
    expect(overview.accountCount).toBe(1);
  });
});
