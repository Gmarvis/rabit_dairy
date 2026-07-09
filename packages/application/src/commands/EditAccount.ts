import {
  Money,
  fail,
  ok,
  roleForType,
  type AccountId,
  type AccountRole,
  type AccountType,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type { AccountRepository } from "../ports/repositories.js";

export interface EditAccountInput {
  userId: UserId;
  id: AccountId;
  name: string;
  type: AccountType;
  role?: AccountRole;
  institution?: string | null;
  mask?: string | null;
  openingBalanceMajor?: number;
  isPrimary?: boolean;
}

/** Command: update an existing account's details. */
export class EditAccount {
  constructor(private readonly accounts: AccountRepository) {}

  async execute(input: EditAccountInput): Promise<Result<{ id: string }>> {
    if (!input.name.trim()) {
      return fail("name_required", "Give the account a name.");
    }
    const account = await this.accounts.findById(input.userId, input.id);
    if (!account) {
      return fail("not_found", "That account no longer exists.");
    }

    const isPrimary = input.isPrimary ?? account.isPrimary;
    account.edit({
      name: input.name,
      type: input.type,
      role: input.role ?? roleForType(input.type),
      institution: input.institution?.trim() || null,
      mask: input.mask?.trim() || null,
      isPrimary,
      openingBalance: Money.fromMajor(input.openingBalanceMajor ?? 0, "XAF"),
    });

    // Only one account can be primary — demote the others.
    if (isPrimary) {
      const all = await this.accounts.listAll(input.userId);
      for (const a of all) {
        if (a.id !== account.id && a.isPrimary) {
          a.setPrimary(false);
          await this.accounts.save(a);
        }
      }
    }

    await this.accounts.save(account);
    return ok({ id: account.id });
  }
}
