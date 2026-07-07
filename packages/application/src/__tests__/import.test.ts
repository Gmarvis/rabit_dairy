import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { ImportStatement } from "../commands/ImportStatement.js";
import { GetDashboard } from "../queries/GetDashboard.js";
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

function wire() {
  const txns = new InMemoryTransactions();
  const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
  const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
  const importer = new ImportStatement(txns, categories, new SeqIds(), new FixedClock());
  return { txns, categories, accounts, importer };
}

describe("ImportStatement", () => {
  it("imports confirmed rows as scan-sourced transactions", async () => {
    const { txns, categories, accounts, importer } = wire();
    const res = await importer.execute({
      userId: USER,
      accountId: ACC,
      entries: [
        { amountMajor: 7_500, direction: "out", categoryId: "cat-groceries", occurredAt: "2026-04-10T00:00:00Z", description: "MoMo — market" },
        { amountMajor: 25_000, direction: "in", categoryId: "cat-salary", occurredAt: "2026-04-11T00:00:00Z", description: "Transfer received" },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.count).toBe(2);

    const dash = await new GetDashboard(txns, categories, accounts).execute(USER, YearMonth.of(2026, 4));
    expect(dash.summary.expenses.major).toBe(7_500);
    expect(dash.summary.income.major).toBe(25_000);
    expect(dash.recent.every((t) => t.source === "scan")).toBe(true);
  });

  it("skips rows with unknown categories and rejects an empty set", async () => {
    const { importer } = wire();
    const empty = await importer.execute({ userId: USER, accountId: ACC, entries: [] });
    expect(empty.ok).toBe(false);

    const allBad = await importer.execute({
      userId: USER, accountId: ACC,
      entries: [{ amountMajor: 100, direction: "out", categoryId: "nope", occurredAt: "2026-04-01T00:00:00Z" }],
    });
    expect(allBad.ok).toBe(false);
  });
});
