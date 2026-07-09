import { Money, type UserId } from "@rabbit/domain";
import type { AccountRepository } from "../ports/repositories.js";
import type { AccountListItem, AccountsOverview } from "./viewmodels.js";

/** Query: the Accounts tab — every account's balance and the net total. */
export class GetAccountsOverview {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(userId: UserId): Promise<AccountsOverview> {
    const accs = await this.accounts.listAll(userId);

    const items: AccountListItem[] = await Promise.all(
      accs.map(async (a) => {
        const net = await this.accounts.netMovementOf(userId, a.id);
        return {
          id: a.id,
          name: a.name,
          type: a.type,
          role: a.role,
          institution: a.institution,
          mask: a.mask,
          balance: a.balance(net),
          openingBalance: a.openingBalance,
          isPrimary: a.isPrimary,
          isDormant: a.isDormant,
        };
      }),
    );

    // Dormant accounts sit out of every headline figure.
    const live = items.filter((i) => !i.isDormant);
    // Total = what you hold (savings + spending) minus what you owe (credit).
    const totalBalance = live.reduce(
      (acc, i) => (i.role === "credit" ? acc.minus(i.balance) : acc.plus(i.balance)),
      Money.zero("XAF"),
    );
    const saved = live
      .filter((i) => i.role === "savings")
      .reduce((acc, i) => acc.plus(i.balance), Money.zero("XAF"));
    const owed = live
      .filter((i) => i.role === "credit")
      .reduce((acc, i) => acc.plus(i.balance), Money.zero("XAF"));

    return {
      totalBalance,
      saved,
      owed,
      accountCount: items.length,
      dormantCount: items.filter((i) => i.isDormant).length,
      accounts: items,
    };
  }
}
