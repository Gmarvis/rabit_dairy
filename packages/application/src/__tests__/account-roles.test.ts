import { describe, it, expect } from "vitest";
import { Account, Money, asAccountId } from "@rabbit/domain";
import { CreateAccount } from "../commands/CreateAccount.js";
import { GetAccountsOverview } from "../queries/GetAccountsOverview.js";
import { GetLifetime } from "../queries/GetLifetime.js";
import {
  InMemoryAccounts,
  InMemoryTransactions,
  SeqIds,
  USER,
} from "./fakes.js";

describe("account roles drive savings and liabilities", () => {
  it("counts a savings account's opening balance as saved, straight away", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns);

    // Opening a savings account with money in it is already saving — no
    // transaction needed.
    await new CreateAccount(accounts, new SeqIds()).execute({
      userId: USER,
      name: "Emergency fund",
      type: "bank_savings", // role defaults to "savings"
      openingBalanceMajor: 200_000,
    });

    const overview = await new GetAccountsOverview(accounts).execute(USER);
    expect(overview.saved.major).toBe(200_000);
    expect(overview.totalBalance.major).toBe(200_000);

    const life = await new GetLifetime(txns, accounts).execute(USER);
    expect(life.saved.major).toBe(200_000);
    expect(life.netWorth.major).toBe(200_000);
  });

  it("treats a credit account as a liability — subtracted from the total and net worth", async () => {
    const txns = new InMemoryTransactions();
    const accounts = new InMemoryAccounts(txns);
    accounts
      .seed(
        Account.create({
          id: asAccountId("acc-cash"),
          userId: USER,
          name: "Cash",
          type: "cash",
          role: "spending",
          currency: "XAF",
          institution: null,
          mask: null,
          openingBalance: Money.fromMajor(100_000, "XAF"),
          isPrimary: true,
          isDormant: false,
        }),
      )
      .seed(
        Account.create({
          id: asAccountId("acc-card"),
          userId: USER,
          name: "Visa card",
          type: "bank_other",
          role: "credit",
          currency: "XAF",
          institution: "UBA",
          mask: "0001",
          openingBalance: Money.fromMajor(30_000, "XAF"), // owed
          isPrimary: false,
          isDormant: false,
        }),
      );

    const overview = await new GetAccountsOverview(accounts).execute(USER);
    expect(overview.owed.major).toBe(30_000);
    // 100k cash − 30k owed = 70k held.
    expect(overview.totalBalance.major).toBe(70_000);

    const life = await new GetLifetime(txns, accounts).execute(USER);
    expect(life.netWorth.major).toBe(70_000);
  });
});
