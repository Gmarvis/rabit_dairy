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
    const live = accs.filter((a) => !a.isDormant);
    const balOf = (a: (typeof live)[number]) =>
      a.balance(movementByAccount.get(a.id) ?? Money.zero("XAF"));
    // Net worth = what you hold minus what you owe (credit accounts).
    const netWorth = live.reduce(
      (sum, a) => sum.plus(a.netWorthContribution(movementByAccount.get(a.id) ?? Money.zero("XAF"))),
      Money.zero("XAF"),
    );
    // "Saved" is a balance you hold, not a category flow: every franc sitting in
    // a savings-role account counts — including its opening balance — so opening
    // a savings account or depositing into it is immediately reflected.
    const saved = live
      .filter((a) => a.isSavings)
      .reduce((sum, a) => sum.plus(balOf(a)), Money.zero("XAF"));

    const firstAt = all.length
      ? all.reduce((min, t) => (t.occurredAt < min ? t.occurredAt : min), all[0]!.occurredAt)
      : null;
    const lastAt = all.length
      ? all.reduce((max, t) => (t.occurredAt > max ? t.occurredAt : max), all[0]!.occurredAt)
      : null;

    // Accumulated-over-time = net worth month by month, so the curve ends
    // exactly at the headline. Transfers between your own accounts cancel out
    // across accounts, so a month's change in net worth is just income minus
    // spending. We start from the opening baseline (money held before the first
    // logged month = netWorth minus the whole earned-minus-spent run) and add
    // each month's flow on top.
    const monthAccum = new Map<string, Money>();
    for (const t of all) {
      let delta: Money;
      if (t.categoryType === "income") delta = t.amount;
      else if (t.isExpense) delta = t.amount.negated();
      else continue; // internal transfers don't change net worth
      const k = t.occurredAt.slice(0, 7); // YYYY-MM
      monthAccum.set(k, (monthAccum.get(k) ?? Money.zero("XAF")).plus(delta));
    }
    const series: { label: string; value: number }[] = [];
    if (firstAt && lastAt) {
      const last = YearMonth.parse(lastAt.slice(0, 7));
      let ym = YearMonth.parse(firstAt.slice(0, 7));
      // Opening baseline: net worth held before any logged flow.
      let cum = netWorth.minus(summary.income.minus(summary.expenses));
      for (let i = 0; i < 600; i++) {
        cum = cum.plus(monthAccum.get(ym.toString()) ?? Money.zero("XAF"));
        series.push({ label: ym.monthName.slice(0, 3), value: cum.minor });
        if (ym.equals(last)) break;
        ym = ym.next();
      }
    }

    return {
      netWorth,
      earned: summary.income,
      spent: summary.expenses,
      saved,
      /** income − spending, all-time (what you kept). */
      net: summary.income.minus(summary.expenses),
      transactionCount: all.length,
      since: firstAt,
      series,
    };
  }
}
