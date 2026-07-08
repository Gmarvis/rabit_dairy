import { Money, YearMonth, summarise, type UserId } from "@rabbit/domain";
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
    const lastAt = all.length
      ? all.reduce((max, t) => (t.occurredAt > max ? t.occurredAt : max), all[0]!.occurredAt)
      : null;

    // Net-worth-over-time: opening baseline, then cumulative monthly movement
    // (non-dormant accounts) from the first active month to the last.
    const dormant = new Set(accs.filter((a) => a.isDormant).map((a) => a.id));
    const totalOpening = accs
      .filter((a) => !a.isDormant)
      .reduce((s, a) => s.plus(a.openingBalance), Money.zero("XAF"));
    const monthMove = new Map<string, Money>();
    for (const t of all) {
      if (dormant.has(t.accountId)) continue;
      const k = t.occurredAt.slice(0, 7); // YYYY-MM
      monthMove.set(k, (monthMove.get(k) ?? Money.zero("XAF")).plus(t.signedAmount));
    }
    const series: { label: string; value: number }[] = [];
    if (firstAt && lastAt) {
      const last = YearMonth.parse(lastAt.slice(0, 7));
      let ym = YearMonth.parse(firstAt.slice(0, 7));
      let cum = totalOpening;
      for (let i = 0; i < 600; i++) {
        cum = cum.plus(monthMove.get(ym.toString()) ?? Money.zero("XAF"));
        series.push({ label: ym.monthName.slice(0, 3), value: cum.minor });
        if (ym.equals(last)) break;
        ym = ym.next();
      }
    }

    return {
      netWorth,
      earned: summary.income,
      spent: summary.expenses,
      saved: summary.savings,
      /** income − spending, all-time (what you kept). */
      net: summary.income.minus(summary.expenses),
      transactionCount: all.length,
      since: firstAt,
      series,
    };
  }
}
