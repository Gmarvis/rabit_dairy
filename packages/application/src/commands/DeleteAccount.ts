import { fail, ok, type AccountId, type Result, type UserId } from "@rabbit/domain";
import type {
  AccountRepository,
  TransactionRepository,
} from "../ports/repositories.js";

export interface DeleteAccountInput {
  userId: UserId;
  id: AccountId;
}

/**
 * Command: permanently delete an account — but only when it holds no
 * transactions, so history is never orphaned. An account that has been used
 * must be archived instead.
 */
export class DeleteAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly txns: TransactionRepository,
  ) {}

  async execute(input: DeleteAccountInput): Promise<Result<{ id: string }>> {
    const account = await this.accounts.findById(input.userId, input.id);
    if (!account) {
      return fail("not_found", "That account no longer exists.");
    }
    const used = await this.txns.listByAccount(input.userId, input.id, 1);
    if (used.length > 0) {
      return fail(
        "has_transactions",
        "This account has transactions. Archive it instead to keep your history.",
      );
    }
    await this.accounts.delete(input.userId, input.id);
    return ok({ id: input.id });
  }
}
