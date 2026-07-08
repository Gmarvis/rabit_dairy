import {
  Money,
  asAccountId,
  fail,
  ok,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type { AccountRepository } from "../ports/repositories.js";

export interface ReconcileAccountBalanceInput {
  userId: UserId;
  accountId: string;
  /** The balance the account should now show (whole FCFA). */
  targetMajor: number;
}

/**
 * Command: set an account's current balance to a known figure — e.g. one read
 * from a scanned bank/mobile-money screenshot. Logged transactions are kept;
 * the opening balance absorbs the difference.
 */
export class ReconcileAccountBalance {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(
    input: ReconcileAccountBalanceInput,
  ): Promise<Result<{ id: string }>> {
    const account = await this.accounts.findById(
      input.userId,
      asAccountId(input.accountId),
    );
    if (!account) {
      return fail("not_found", "That account no longer exists.");
    }
    const netMovement = await this.accounts.netMovementOf(
      input.userId,
      account.id,
    );
    account.reconcileBalanceTo(
      Money.fromMajor(input.targetMajor, "XAF"),
      netMovement,
    );
    await this.accounts.save(account);
    return ok({ id: account.id });
  }
}
