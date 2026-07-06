import {
  Money,
  Transaction,
  defaultDirection,
  asTransactionId,
  asTransferId,
  fail,
  ok,
  type Direction,
  type PaymentMethod,
  type Result,
  type TransactionSource,
  type AccountId,
  type CategoryId,
  type UserId,
} from "@rabbit/domain";
import type {
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

export interface LogTransactionInput {
  userId: UserId;
  accountId: AccountId;
  categoryId: CategoryId;
  amountMajor: number;
  /** Defaults to now. */
  occurredAt?: string;
  description?: string | null;
  paymentMethod?: PaymentMethod | null;
  source?: TransactionSource;
  /** Override the category's default cash direction (e.g. a refund). */
  direction?: Direction;
  voiceNotePath?: string | null;
  voiceTranscript?: string | null;
  receiptPath?: string | null;
  transferId?: string | null;
}

/**
 * Command: record a single transaction against an account. Looks up the
 * category to denormalise its type and default the cash direction.
 */
export class LogTransaction {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: LogTransactionInput,
  ): Promise<Result<{ id: string }>> {
    if (!(input.amountMajor > 0)) {
      return fail("amount_invalid", "Amount must be greater than zero.");
    }
    const category = await this.categories.findById(
      input.userId,
      input.categoryId,
    );
    if (!category) {
      return fail("category_not_found", "That category no longer exists.");
    }

    const txn = Transaction.create({
      id: asTransactionId(this.ids.next()),
      userId: input.userId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      categoryType: category.type,
      direction: input.direction ?? defaultDirection(category.type),
      amount: Money.fromMajor(input.amountMajor, "XAF"),
      occurredAt: input.occurredAt ?? this.clock.nowIso(),
      description: input.description ?? null,
      paymentMethod:
        input.paymentMethod ?? category.defaultPaymentMethod ?? null,
      source: input.source ?? "manual",
      voiceNotePath: input.voiceNotePath ?? null,
      voiceTranscript: input.voiceTranscript ?? null,
      receiptPath: input.receiptPath ?? null,
      transferId: input.transferId ? asTransferId(input.transferId) : null,
    });

    await this.txns.save(txn);
    return ok({ id: txn.id });
  }
}
