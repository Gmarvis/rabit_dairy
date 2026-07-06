import {
  Money,
  Transaction,
  asTransactionId,
  fail,
  ok,
  type AccountId,
  type CategoryId,
  type Result,
  type TransactionSource,
  type UserId,
} from "@rabbit/domain";
import type { TransactionRepository } from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

export interface RecordSavingsMovementInput {
  userId: UserId;
  /** The savings account being deposited into / withdrawn from. */
  savingsAccountId: AccountId;
  savingsCategoryId: CategoryId;
  kind: "deposit" | "withdrawal";
  amountMajor: number;
  occurredAt?: string;
  /** Attached proof — the snapped deposit / withdrawal slip. */
  receiptPath?: string | null;
  source?: TransactionSource;
}

/**
 * Command: record a savings deposit or withdrawal against the savings account,
 * with an optional receipt image. A deposit is money `in`, a withdrawal `out`.
 * (Double-entry against the funding account is a Phase-5 enhancement.)
 */
export class RecordSavingsMovement {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: RecordSavingsMovementInput,
  ): Promise<Result<{ id: string }>> {
    if (!(input.amountMajor > 0)) {
      return fail("amount_invalid", "Amount must be greater than zero.");
    }

    const txn = Transaction.create({
      id: asTransactionId(this.ids.next()),
      userId: input.userId,
      accountId: input.savingsAccountId,
      categoryId: input.savingsCategoryId,
      categoryType: "savings",
      direction: input.kind === "deposit" ? "in" : "out",
      amount: Money.fromMajor(input.amountMajor, "XAF"),
      occurredAt: input.occurredAt ?? this.clock.nowIso(),
      description: input.kind === "deposit" ? "Savings deposit" : "Savings withdrawal",
      paymentMethod: "bank_transfer",
      source: input.source ?? (input.receiptPath ? "receipt" : "manual"),
      voiceNotePath: null,
      voiceTranscript: null,
      receiptPath: input.receiptPath ?? null,
      transferId: null,
    });

    await this.txns.save(txn);
    return ok({ id: txn.id });
  }
}
