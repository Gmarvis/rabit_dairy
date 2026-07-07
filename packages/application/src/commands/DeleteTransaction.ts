import {
  fail,
  ok,
  type Result,
  type TransactionId,
  type UserId,
} from "@rabbit/domain";
import type { TransactionRepository } from "../ports/repositories.js";

export interface DeleteTransactionInput {
  userId: UserId;
  transactionId: TransactionId;
}

/** Command: permanently remove a transaction the user owns. */
export class DeleteTransaction {
  constructor(private readonly txns: TransactionRepository) {}

  async execute(input: DeleteTransactionInput): Promise<Result<{ id: string }>> {
    const existing = await this.txns.findById(input.userId, input.transactionId);
    if (!existing) {
      return fail("transaction_not_found", "That transaction no longer exists.");
    }
    await this.txns.delete(input.userId, input.transactionId);
    return ok({ id: input.transactionId });
  }
}
