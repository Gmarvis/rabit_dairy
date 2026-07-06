import {
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
    };
  }
}
