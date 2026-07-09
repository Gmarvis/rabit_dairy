import {
  Account,
  Money,
  asAccountId,
  fail,
  ok,
  roleForType,
  type AccountRole,
  type AccountType,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type { AccountRepository } from "../ports/repositories.js";
import type { IdGenerator } from "../ports/services.js";

export interface CreateAccountInput {
  userId: UserId;
  name: string;
  type: AccountType;
  /** What the account is for. Defaults from the type when omitted. */
  role?: AccountRole;
  institution?: string | null;
  mask?: string | null;
  openingBalanceMajor?: number;
  isPrimary?: boolean;
}

/** Command: add a new account (bank, mobile money, or cash). */
export class CreateAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateAccountInput): Promise<Result<{ id: string }>> {
    if (!input.name.trim()) {
      return fail("name_required", "Give the account a name.");
    }
    const account = Account.create({
      id: asAccountId(this.ids.next()),
      userId: input.userId,
      name: input.name,
      type: input.type,
      role: input.role ?? roleForType(input.type),
      currency: "XAF",
      institution: input.institution?.trim() || null,
      mask: input.mask?.trim() || null,
      openingBalance: Money.fromMajor(input.openingBalanceMajor ?? 0, "XAF"),
      isPrimary: input.isPrimary ?? false,
      isDormant: false,
    });
    await this.accounts.save(account);
    return ok({ id: account.id });
  }
}
