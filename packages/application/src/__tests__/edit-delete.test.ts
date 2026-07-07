import { describe, it, expect } from "vitest";
import { asAccountId, asCategoryId, asTransactionId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { EditTransaction } from "../commands/EditTransaction.js";
import { DeleteTransaction } from "../commands/DeleteTransaction.js";
import { GetTransaction } from "../queries/GetTransaction.js";
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
  const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
  const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
  const log = new LogTransaction(txns, categories, new SeqIds(), new FixedClock());
  const edit = new EditTransaction(txns, categories);
  const del = new DeleteTransaction(txns);
  const get = new GetTransaction(txns, categories, accounts);
  return { txns, categories, accounts, log, edit, del, get };
}

const acc = asAccountId("acc-salary");

async function seedGroceries(log: LogTransaction) {
  const res = await log.execute({
    userId: USER,
    accountId: acc,
    categoryId: asCategoryId("cat-groceries"),
    amountMajor: 11_200,
    occurredAt: "2026-04-04T00:00:00Z",
    description: "Market run",
  });
  if (!res.ok) throw new Error("seed failed");
  return res.value.id;
}

describe("EditTransaction", () => {
  it("updates amount and re-denormalises when the category moves to income", async () => {
    const { log, edit, txns } = wire();
    const id = await seedGroceries(log);

    const res = await edit.execute({
      userId: USER,
      transactionId: asTransactionId(id),
      accountId: acc,
      categoryId: asCategoryId("cat-salary"),
      amountMajor: 500_000,
    });

    expect(res.ok).toBe(true);
    const saved = txns.store.get(id)!;
    expect(saved.amount.major).toBe(500_000);
    expect(saved.categoryType).toBe("income");
    expect(saved.direction).toBe("in"); // was "out" as a grocery expense
    expect(saved.signedAmount.major).toBe(500_000);
    expect(txns.store.size).toBe(1); // edited in place, same id
  });

  it("rejects a zero amount and an unknown transaction", async () => {
    const { log, edit } = wire();
    const id = await seedGroceries(log);

    const zero = await edit.execute({
      userId: USER, transactionId: asTransactionId(id), accountId: acc,
      categoryId: asCategoryId("cat-groceries"), amountMajor: 0,
    });
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.error.code).toBe("amount_invalid");

    const missing = await edit.execute({
      userId: USER, transactionId: asTransactionId("ghost"), accountId: acc,
      categoryId: asCategoryId("cat-groceries"), amountMajor: 100,
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe("transaction_not_found");
  });
});

describe("DeleteTransaction", () => {
  it("removes the transaction and 404s on a second delete", async () => {
    const { log, del, txns } = wire();
    const id = await seedGroceries(log);

    const first = await del.execute({ userId: USER, transactionId: asTransactionId(id) });
    expect(first.ok).toBe(true);
    expect(txns.store.size).toBe(0);

    const second = await del.execute({ userId: USER, transactionId: asTransactionId(id) });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("transaction_not_found");
  });
});

describe("GetTransaction", () => {
  it("loads the detail with resolved names, or null when missing", async () => {
    const { log, get } = wire();
    const id = await seedGroceries(log);

    const view = await get.execute(USER, asTransactionId(id));
    expect(view).not.toBeNull();
    expect(view!.amountMajor).toBe(11_200);
    expect(view!.categoryName).toBe("Groceries & Food");
    expect(view!.accountName).toBe("Salary account");
    expect(view!.description).toBe("Market run");

    expect(await get.execute(USER, asTransactionId("ghost"))).toBeNull();
  });
});
