import type { TransactionId, UserId } from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { TransactionDetailView } from "./viewmodels.js";

/** Query: load one transaction with its category/account names for editing. */
export class GetTransaction {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(
    userId: UserId,
    id: TransactionId,
  ): Promise<TransactionDetailView | null> {
    const txn = await this.txns.findById(userId, id);
    if (!txn) return null;

    const [category, account] = await Promise.all([
      this.categories.findById(userId, txn.categoryId),
      this.accounts.findById(userId, txn.accountId),
    ]);

    return {
      id: txn.id,
      amountMajor: txn.amount.major,
      direction: txn.direction,
      categoryId: txn.categoryId,
      categoryName: category?.name ?? "Uncategorised",
      categoryColor: category?.color ?? "#888888",
      categoryType: txn.categoryType,
      accountId: txn.accountId,
      accountName: account?.name ?? "Account",
      occurredAt: txn.occurredAt,
      description: txn.description,
      paymentMethod: txn.paymentMethod,
      source: txn.source,
      voiceTranscript: txn.voiceTranscript,
      hasReceipt: !!txn.receiptPath,
    };
  }
}
