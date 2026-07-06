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
          institution: a.institution,
          mask: a.mask,
          balance: a.balance(net),
          isPrimary: a.isPrimary,
          isDormant: a.isDormant,
        };
      }),
    );

    // Dormant accounts are excluded from the headline total.
    const totalBalance = items
      .filter((i) => !i.isDormant)
      .reduce((acc, i) => acc.plus(i.balance), Money.zero("XAF"));

    return {
      totalBalance,
      accountCount: items.length,
      dormantCount: items.filter((i) => i.isDormant).length,
      accounts: items,
    };
  }
}
