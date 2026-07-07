import {
  Money,
  Transaction,
  asTransactionId,
  fail,
  ok,
  type AccountId,
  type CategoryId,
  type Category,
  type Direction,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type {
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

/** One confirmed row from a scanned statement, ready to import. */
export interface ImportEntry {
  amountMajor: number;
  direction: Direction;
  categoryId: string;
  occurredAt: string;
  description?: string | null;
}

export interface ImportStatementInput {
  userId: UserId;
  accountId: AccountId;
  entries: ImportEntry[];
}

/**
 * Command: import the user-confirmed rows from a scanned bank / mobile-money
 * statement as transactions (source "scan"). Nothing is written until the user
 * confirms on the review screen — this handler only persists that confirmed set.
 */
export class ImportStatement {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: ImportStatementInput,
  ): Promise<Result<{ count: number }>> {
    if (input.entries.length === 0) {
      return fail("empty", "Select at least one row to import.");
    }
    const cats = await this.categories.listAll(input.userId);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));

    const built: Transaction[] = [];
    for (const e of input.entries) {
      if (!(e.amountMajor > 0)) continue;
      const cat = catById.get(e.categoryId);
      if (!cat) continue; // skip rows whose category no longer exists
      built.push(
        Transaction.create({
          id: asTransactionId(this.ids.next()),
          userId: input.userId,
          accountId: input.accountId,
          categoryId: e.categoryId as CategoryId,
          categoryType: cat.type,
          direction: e.direction,
          amount: Money.fromMajor(e.amountMajor, "XAF"),
          occurredAt: e.occurredAt || this.clock.nowIso(),
          description: e.description ?? null,
          paymentMethod: cat.defaultPaymentMethod,
          source: "scan",
          voiceNotePath: null,
          voiceTranscript: null,
          receiptPath: null,
          transferId: null,
        }),
      );
    }

    if (built.length === 0) {
      return fail("nothing_valid", "None of the selected rows could be imported.");
    }
    await this.txns.saveMany(built);
    return ok({ count: built.length });
  }
}
