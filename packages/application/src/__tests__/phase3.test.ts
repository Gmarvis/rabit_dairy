import { describe, it, expect } from "vitest";
import {
  Budget,
  YearMonth,
  asCategoryId,
  type CategoryId,
  type UserId,
} from "@rabbit/domain";
import { CreateAccount } from "../commands/CreateAccount.js";
import { SetBudget } from "../commands/SetBudget.js";
import { GetAccountsOverview } from "../queries/GetAccountsOverview.js";
import { GetBudgets } from "../queries/GetBudgets.js";
import type { BudgetRepository } from "../ports/repositories.js";
import {
  InMemoryAccounts,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  groceriesCategory,
} from "./fakes.js";

class InMemoryBudgets implements BudgetRepository {
  store: Budget[] = [];
  async listByPeriod(_u: UserId, p: YearMonth) {
    return this.store.filter((b) => b.year === p.year && b.month === p.month);
  }
  async findFor(_u: UserId, categoryId: CategoryId, p: YearMonth) {
    return (
      this.store.find(
        (b) => b.categoryId === categoryId && b.year === p.year && b.month === p.month,
      ) ?? null
    );
  }
  async save(b: Budget) {
    const i = this.store.findIndex((x) => x.id === b.id);
    if (i >= 0) this.store[i] = b;
    else this.store.push(b);
  }
}

describe("CreateAccount", () => {
  it("creates an account that shows up with its opening balance", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns);
    const res = await new CreateAccount(accounts, new SeqIds()).execute({
      userId: USER,
      name: "UBA savings",
      type: "bank_savings",
      openingBalanceMajor: 50_000,
    });
    expect(res.ok).toBe(true);

    const overview = await new GetAccountsOverview(accounts).execute(USER);
    expect(overview.accounts).toHaveLength(1);
    expect(overview.accounts[0]!.name).toBe("UBA savings");
    expect(overview.totalBalance.major).toBe(50_000);
  });

  it("rejects a blank name", async () => {
    const accounts = new InMemoryAccounts(new InMemoryTransactions());
    const res = await new CreateAccount(accounts, new SeqIds()).execute({
      userId: USER, name: "  ", type: "cash",
    });
    expect(res.ok).toBe(false);
  });
});

describe("SetBudget + GetBudgets", () => {
  it("upserts a budget and reads it back for the period", async () => {
    const budgets = new InMemoryBudgets();
    const categories = new InMemoryCategories().seed(groceriesCategory());
    const setBudget = new SetBudget(budgets, new SeqIds());

    await setBudget.execute({
      userId: USER,
      categoryId: asCategoryId("cat-groceries"),
      year: 2026, month: 4, amountMajor: 60_000,
    });
    // Upsert: setting again updates, not duplicates.
    await setBudget.execute({
      userId: USER,
      categoryId: asCategoryId("cat-groceries"),
      year: 2026, month: 4, amountMajor: 75_000,
    });

    const view = await new GetBudgets(budgets, categories).execute(USER, YearMonth.of(2026, 4));
    const groceries = view.items.find((i) => i.categoryId === "cat-groceries");
    expect(groceries?.amountMajor).toBe(75_000);
    expect(budgets.store).toHaveLength(1);
  });
});
