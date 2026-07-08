import {
  type Category,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { TransactionListItem } from "./viewmodels.js";

/**
 * Query: a flat, newest-first list of the user's transactions over the last N
 * months — the corpus the search screen filters client-side. Anchored on the
 * given "current" month so it's deterministic and testable.
 */
export class GetRecentTransactions {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(
    userId: UserId,
    current: YearMonth,
    monthsBack = 12,
  ): Promise<TransactionListItem[]> {
    const periods: YearMonth[] = [];
    let p = current;
    for (let i = 0; i < monthsBack; i++) {
      periods.push(p);
      p = p.previous();
    }

    const [perMonth, cats, accs] = await Promise.all([
      Promise.all(periods.map((ym) => this.txns.listByPeriod(userId, ym))),
      this.categories.listAll(userId),
      this.accounts.listAll(userId),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const accNameById = new Map(accs.map((a) => [a.id, a.name]));

    const items: TransactionListItem[] = perMonth.flat().map((t) => {
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

    // Newest first.
    items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return items;
  }
}
