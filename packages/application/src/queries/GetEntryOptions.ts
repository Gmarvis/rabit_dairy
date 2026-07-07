import type {
  AccountType,
  CategoryType,
  PaymentMethod,
  UserId,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
} from "../ports/repositories.js";

export interface EntryCategoryOption {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  defaultPaymentMethod: PaymentMethod | null;
}

export interface EntryAccountOption {
  id: string;
  name: string;
  type: AccountType;
  isPrimary: boolean;
}

export interface EntryOptions {
  categories: EntryCategoryOption[];
  accounts: EntryAccountOption[];
}

/** Query: the pickers for the manual-entry screen — live categories & accounts. */
export class GetEntryOptions {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(userId: UserId): Promise<EntryOptions> {
    const [cats, accs] = await Promise.all([
      this.categories.listAll(userId),
      this.accounts.listAll(userId),
    ]);
    return {
      categories: cats
        .filter((c) => !c.isArchived)
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          color: c.color,
          defaultPaymentMethod: c.defaultPaymentMethod,
        })),
      accounts: accs
        .filter((a) => !a.isDormant)
        .map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          isPrimary: a.isPrimary,
        })),
    };
  }
}
