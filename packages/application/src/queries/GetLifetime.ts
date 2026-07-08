import { Money, summarise, type UserId } from "@rabbit/domain";
import type {
  AccountRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { LifetimeView } from "./viewmodels.js";

/**
 * Query: the all-time picture — every franc earned, spent and set aside since
 * the user started, plus what they hold now across all accounts. Makes the app
 * a full financial overview, not just monthly/yearly tracking.
 */
export class GetLifetime {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(userId: UserId): Promise<LifetimeView> {
    const [all, accs] = await Promise.all([
      this.txns.listAll(userId),
      this.accounts.listAll(userId),
    ]);

    const summary = summarise(all);

    // Net worth = opening balances + this account's movements, non-dormant only.
    const movementByAccount = new Map<string, Money>();
    for (const t of all) {
      movementByAccount.set(
        t.accountId,
        (movementByAccount.get(t.accountId) ?? Money.zero("XAF")).plus(t.signedAmount),
      );
    }
    const netWorth = accs.reduce(
      (sum, a) =>
        a.isDormant ? sum : sum.plus(a.balance(movementByAccount.get(a.id) ?? Money.zero("XAF"))),
      Money.zero("XAF"),
    );

    const firstAt = all.length
      ? all.reduce((min, t) => (t.occurredAt < min ? t.occurredAt : min), all[0]!.occurredAt)
      : null;

    return {
      netWorth,
      earned: summary.income,
      spent: summary.expenses,
      saved: summary.savings,
      /** income − spending, all-time (what you kept). */
      net: summary.income.minus(summary.expenses),
      transactionCount: all.length,
      since: firstAt,
    };
  }
}
