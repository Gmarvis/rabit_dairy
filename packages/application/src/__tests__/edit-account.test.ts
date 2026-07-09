import { describe, it, expect } from "vitest";
import { asAccountId, asCategoryId } from "@rabbit/domain";
import { CreateAccount } from "../commands/CreateAccount.js";
import { EditAccount } from "../commands/EditAccount.js";
import { ArchiveAccount } from "../commands/ArchiveAccount.js";
import { DeleteAccount } from "../commands/DeleteAccount.js";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetAccountsOverview } from "../queries/GetAccountsOverview.js";
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

describe("editing accounts", () => {
  it("updates an account's details", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const res = await new EditAccount(accounts).execute({
      userId: USER,
      id: asAccountId("acc-salary"),
      name: "Main current",
      type: "bank_other",
      role: "spending",
      institution: "Ecobank",
      mask: "9999",
      openingBalanceMajor: 5_000,
    });
    expect(res.ok).toBe(true);
    const a = (await accounts.listAll())[0]!;
    expect(a.name).toBe("Main current");
    expect(a.type).toBe("bank_other");
    expect(a.institution).toBe("Ecobank");
    expect(a.openingBalance.major).toBe(5_000);
  });

  it("keeps a single primary account when one is promoted", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns);
    await new CreateAccount(accounts, new SeqIds()).execute({ userId: USER, name: "A", type: "cash", isPrimary: true });
    await new CreateAccount(accounts, new SeqIds()).execute({ userId: USER, name: "B", type: "mobile_money" });
    const all = await accounts.listAll();
    const b = all.find((x) => x.name === "B")!;
    await new EditAccount(accounts).execute({ userId: USER, id: b.id as never, name: "B", type: "mobile_money", isPrimary: true });
    const after = await accounts.listAll();
    expect(after.filter((x) => x.isPrimary)).toHaveLength(1);
    expect(after.find((x) => x.isPrimary)!.name).toBe("B");
  });

  it("archives and reopens an account", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const cmd = new ArchiveAccount(accounts);
    await cmd.execute({ userId: USER, id: asAccountId("acc-salary"), dormant: true });
    expect((await accounts.listAll())[0]!.isDormant).toBe(true);
    await cmd.execute({ userId: USER, id: asAccountId("acc-salary"), dormant: false });
    expect((await accounts.listAll())[0]!.isDormant).toBe(false);
  });

  it("deletes an empty account but refuses one with transactions", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory());
    const accounts = new InMemoryAccounts(txns).seed(salaryAccount());
    const del = new DeleteAccount(accounts, txns);

    // Log a transaction — now it can't be deleted, only archived.
    await new LogTransaction(txns, categories, new SeqIds(), new FixedClock()).execute({
      userId: USER,
      accountId: asAccountId("acc-salary"),
      categoryId: asCategoryId("cat-salary"),
      amountMajor: 1_000,
    });
    const blocked = await del.execute({ userId: USER, id: asAccountId("acc-salary") });
    expect(blocked.ok).toBe(false);
    expect((await accounts.listAll())).toHaveLength(1);

    // A fresh, unused account deletes cleanly.
    await new CreateAccount(accounts, new SeqIds()).execute({ userId: USER, name: "Spare", type: "cash" });
    const spare = (await accounts.listAll()).find((x) => x.name === "Spare")!;
    const okRes = await del.execute({ userId: USER, id: spare.id as never });
    expect(okRes.ok).toBe(true);
    expect((await accounts.listAll()).some((x) => x.name === "Spare")).toBe(false);
  });

  it("still reports the opening balance in the overview", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns);
    await new CreateAccount(accounts, new SeqIds()).execute({ userId: USER, name: "Wallet", type: "cash", openingBalanceMajor: 12_000 });
    const overview = await new GetAccountsOverview(accounts).execute(USER);
    expect(overview.accounts[0]!.openingBalance.major).toBe(12_000);
  });
});
