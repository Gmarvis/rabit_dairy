import type { AccountId, Category, UserId } from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { AccountLedgerView, TransactionListItem } from "./viewmodels.js";

/** Query: one account's balance, running-balance history, and its ledger. */
export class GetAccountLedger {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(
    userId: UserId,
    accountId: AccountId,
    limit = 100,
  ): Promise<AccountLedgerView | null> {
    const account = await this.accounts.findById(userId, accountId);
    if (!account) return null;

    const [rows, cats] = await Promise.all([
      this.txns.listByAccount(userId, accountId, limit),
      this.categories.listAll(userId),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));

    // rows come newest-first; walk oldest-first to build the running balance.
    const oldestFirst = [...rows].reverse();
    let running = account.openingBalance;
    const balanceHistory: number[] = [running.major];
    for (const t of oldestFirst) {
      running = running.plus(t.signedAmount);
      balanceHistory.push(running.major);
    }

    const transactions: TransactionListItem[] = rows.map((t) => {
      const cat = catById.get(t.categoryId);
      return {
        id: t.id,
        title: t.description ?? cat?.name ?? "Transaction",
        categoryName: cat?.name ?? "—",
        categoryColor: cat?.color ?? "#888888",
        categoryType: t.categoryType,
        accountName: account.name,
        paymentMethod: t.paymentMethod,
        occurredAt: t.occurredAt,
        signedAmount: t.signedAmount,
        source: t.source,
        hasVoiceNote: t.voiceNotePath !== null,
        hasReceipt: t.receiptPath !== null,
      };
    });

    const net = await this.accounts.netMovementOf(userId, accountId);

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      institution: account.institution,
      mask: account.mask,
      balance: account.balance(net),
      isPrimary: account.isPrimary,
      isDormant: account.isDormant,
      isSavings: account.type === "bank_savings",
      balanceHistory,
      transactions,
    };
  }
}
