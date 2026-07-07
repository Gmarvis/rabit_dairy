import {
  Money,
  Transaction,
  defaultDirection,
  fail,
  ok,
  type PaymentMethod,
  type Result,
  type AccountId,
  type CategoryId,
  type TransactionId,
  type UserId,
} from "@rabbit/domain";
import type {
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";

export interface EditTransactionInput {
  userId: UserId;
  transactionId: TransactionId;
  accountId: AccountId;
  categoryId: CategoryId;
  amountMajor: number;
  occurredAt?: string;
  description?: string | null;
  paymentMethod?: PaymentMethod | null;
}

/**
 * Command: change an existing transaction. Rebuilds the aggregate from its
 * snapshot with the edited fields so all invariants (positive amount, trimmed
 * description) are re-checked, while preserving id, source and any attachments.
 * Re-denormalises the category type and cash direction when the category moves.
 */
export class EditTransaction {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(input: EditTransactionInput): Promise<Result<{ id: string }>> {
    if (!(input.amountMajor > 0)) {
      return fail("amount_invalid", "Amount must be greater than zero.");
    }
    const existing = await this.txns.findById(input.userId, input.transactionId);
    if (!existing) {
      return fail("transaction_not_found", "That transaction no longer exists.");
    }
    const category = await this.categories.findById(input.userId, input.categoryId);
    if (!category) {
      return fail("category_not_found", "That category no longer exists.");
    }

    const prev = existing.snapshot();
    const updated = Transaction.create({
      ...prev,
      accountId: input.accountId,
      categoryId: input.categoryId,
      categoryType: category.type,
      direction: defaultDirection(category.type),
      amount: Money.fromMajor(input.amountMajor, "XAF"),
      occurredAt: input.occurredAt ?? prev.occurredAt,
      description: input.description ?? null,
      paymentMethod: input.paymentMethod ?? prev.paymentMethod,
    });

    await this.txns.save(updated);
    return ok({ id: updated.id });
  }
}
