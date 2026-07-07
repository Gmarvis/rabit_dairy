import { describe, it, expect } from "vitest";
import { GetEntryOptions } from "../queries/GetEntryOptions.js";
import {
  InMemoryAccounts,
  InMemoryCategories,
  InMemoryTransactions,
  USER,
  groceriesCategory,
  salaryAccount,
  salaryCategory,
} from "./fakes.js";

describe("GetEntryOptions", () => {
  it("returns non-archived categories and non-dormant accounts", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories()
      .seed(salaryCategory())
      .seed(groceriesCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());

    const opts = await new GetEntryOptions(categories, accounts).execute(USER);

    expect(opts.categories.map((c) => c.name).sort()).toEqual([
      "Groceries & Food",
      "Salary (Net)",
    ]);
    expect(opts.accounts).toHaveLength(1);
    expect(opts.accounts[0]!.isPrimary).toBe(true);
    // Colour rides along so the picker chips match the charts.
    expect(opts.categories[0]!.color).toMatch(/^#/);
  });
});
