import {
  Money,
  Transaction,
  asTransactionId,
  asTransferId,
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
  /** The everyday account the money moves from (deposit) or back to (withdrawal). */
  fundingAccountId: AccountId;
  savingsCategoryId: CategoryId;
  kind: "deposit" | "withdrawal";
  amountMajor: number;
  occurredAt?: string;
  /** Attached proof — the snapped deposit / withdrawal slip. */
  receiptPath?: string | null;
  source?: TransactionSource;
}

/**
 * Command: record a savings deposit or withdrawal as a proper double-entry
 * transfer, so the money moves between accounts instead of vanishing. Two legs
 * share a transferId:
 *   • the savings-account leg is the counted one (it's what "saved" measures);
 *   • the funding-account leg carries the transferId and is left out of the
 *     income/spending/savings totals — it's the same money changing pockets.
 * Net worth is therefore unchanged by a transfer, and reconciles with what
 * you've accumulated.
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
    if (input.fundingAccountId === input.savingsAccountId) {
      return fail("same_account", "Pick a different account to move the money from.");
    }

    const deposit = input.kind === "deposit";
    const amount = Money.fromMajor(input.amountMajor, "XAF");
    const occurredAt = input.occurredAt ?? this.clock.nowIso();
    const transferId = asTransferId(this.ids.next());
    const description = deposit ? "Savings deposit" : "Savings withdrawal";

    // Counted leg on the savings account (drives the "saved" figure).
    const savingsLeg = Transaction.create({
      id: asTransactionId(this.ids.next()),
      userId: input.userId,
      accountId: input.savingsAccountId,
      categoryId: input.savingsCategoryId,
      categoryType: "savings",
      direction: deposit ? "in" : "out",
      amount,
      occurredAt,
      description,
      paymentMethod: "bank_transfer",
      source: input.source ?? (input.receiptPath ? "receipt" : "manual"),
      voiceNotePath: null,
      voiceTranscript: null,
      receiptPath: input.receiptPath ?? null,
      transferId: null,
    });

    // Matching leg on the funding account — carries the transferId, so it's
    // excluded from P&L totals but still moves the balance.
    const fundingLeg = Transaction.create({
      id: asTransactionId(this.ids.next()),
      userId: input.userId,
      accountId: input.fundingAccountId,
      categoryId: input.savingsCategoryId,
      categoryType: "savings",
      direction: deposit ? "out" : "in",
      amount,
      occurredAt,
      description,
      paymentMethod: "bank_transfer",
      source: input.source ?? "manual",
      voiceNotePath: null,
      voiceTranscript: null,
      receiptPath: null,
      transferId,
    });

    await this.txns.saveMany([savingsLeg, fundingLeg]);
    return ok({ id: savingsLeg.id });
  }
}
