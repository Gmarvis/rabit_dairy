import { fail, ok, type AccountId, type Result, type UserId } from "@rabbit/domain";
import type { AccountRepository } from "../ports/repositories.js";

export interface ArchiveAccountInput {
  userId: UserId;
  id: AccountId;
  /** True to archive (hide + drop from totals); false to reopen. */
  dormant: boolean;
}

/**
 * Command: archive (close) or reopen an account. Archiving keeps the account
 * and all its history but hides it and leaves it out of net-worth totals — the
 * safe way to "remove" an account that has transactions.
 */
export class ArchiveAccount {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(input: ArchiveAccountInput): Promise<Result<{ id: string }>> {
    const account = await this.accounts.findById(input.userId, input.id);
    if (!account) {
      return fail("not_found", "That account no longer exists.");
    }
    if (input.dormant) account.markDormant();
    else account.reactivate();
    await this.accounts.save(account);
    return ok({ id: account.id });
  }
}
