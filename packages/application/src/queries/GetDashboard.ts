import {
  Money,
  summarise,
  type Category,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { DashboardView, TransactionListItem } from "./viewmodels.js";

/** Query: everything the Dashboard (Home) screen needs for a period. */
export class GetDashboard {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(
    userId: UserId,
    period: YearMonth,
    recentLimit = 5,
  ): Promise<DashboardView> {
    const [periodTxns, cats, accs] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.categories.listAll(userId),
      this.accounts.listAll(userId),
    ]);

    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const accNameById = new Map(accs.map((a) => [a.id, a.name]));

    // Net worth = sum of non-dormant account balances; the period change is the
    // signed movement across those accounts this period.
    const netMovements = await Promise.all(accs.map((a) => this.accounts.netMovementOf(userId, a.id)));
    const dormantIds = new Set(accs.filter((a) => a.isDormant).map((a) => a.id));
    const netWorth = accs.reduce(
      (sum, a, i) => (a.isDormant ? sum : sum.plus(a.balance(netMovements[i]!))),
      Money.zero("XAF"),
    );
    const netWorthChange = periodTxns
      .filter((t) => !dormantIds.has(t.accountId))
      .reduce((sum, t) => sum.plus(t.signedAmount), Money.zero("XAF"));

    const recent: TransactionListItem[] = periodTxns
      .slice(0, recentLimit)
      .map((t) => {
        const cat = catById.get(t.categoryId);
        return {
          id: t.id,
          title: t.description ?? cat?.name ?? "Transaction",
          categoryName: cat?.name ?? "—",
          categoryColor: cat?.color ?? "#888888",
          categoryType: t.categoryType,
          accountName: accNameById.get(t.accountId) ?? "—",
          paymentMethod: t.paymentMethod,
          occurredAt: t.occurredAt,
          signedAmount: t.signedAmount,
          source: t.source,
          hasVoiceNote: t.voiceNotePath !== null,
          hasReceipt: t.receiptPath !== null,
        };
      });

    return {
      periodLabel: `${period.monthName} ${period.year}`,
      summary: summarise(periodTxns),
      recent,
      netWorth,
      netWorthChange,
      accountCount: accs.length,
      dormantCount: dormantIds.size,
    };
  }
}
