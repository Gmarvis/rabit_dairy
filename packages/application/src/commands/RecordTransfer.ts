import {
  Category,
  Money,
  Transaction,
  asCategoryId,
  asTransactionId,
  asTransferId,
  fail,
  ok,
  type AccountId,
  type Result,
  type TransactionSource,
  type UserId,
} from "@rabbit/domain";
import type {
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

/** Name of the hidden category that carries transfer legs. */
const TRANSFER_CATEGORY = "Transfer";

export interface RecordTransferInput {
  userId: UserId;
  /** Money leaves this account. */
  fromAccountId: AccountId;
  /** Money lands in this account. */
  toAccountId: AccountId;
  amountMajor: number;
  occurredAt?: string;
  receiptPath?: string | null;
  source?: TransactionSource;
}

/**
 * Command: move money between two of the user's own accounts. It's a pure
 * double-entry transfer — both legs carry the same transferId, so it never
 * counts as income, spending or fresh saving; only the two balances move (and
 * with them net worth stays put, while a savings account's balance — and the
 * "saved" total — reflects money moved into it).
 *
 * Transfers need a category (the schema requires one), so we keep a single
 * hidden "Transfer" category per user and create it on first use — no seeding
 * or migration required.
 */
export class RecordTransfer {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: RecordTransferInput): Promise<Result<{ id: string }>> {
    if (!(input.amountMajor > 0)) {
      return fail("amount_invalid", "Amount must be greater than zero.");
    }
    if (input.fromAccountId === input.toAccountId) {
      return fail("same_account", "Pick two different accounts to move money between.");
    }

    // Find or create the hidden carrier category. It's archived so it never
    // shows in pickers, and its type is irrelevant to the P&L because both legs
    // are excluded from summaries via their transferId.
    const cats = await this.categories.listAll(input.userId);
    let carrier = cats.find((c) => c.name === TRANSFER_CATEGORY);
    if (!carrier) {
      carrier = Category.create({
        id: asCategoryId(this.ids.next()),
        userId: input.userId,
        name: TRANSFER_CATEGORY,
        type: "savings",
        color: "#8895A7",
        defaultPaymentMethod: null,
        isArchived: true,
      });
      await this.categories.save(carrier);
    }

    const amount = Money.fromMajor(input.amountMajor, "XAF");
    const occurredAt = input.occurredAt ?? this.clock.nowIso();
    const transferId = asTransferId(this.ids.next());
    const source = input.source ?? (input.receiptPath ? "receipt" : "manual");

    const common = {
      userId: input.userId,
      categoryId: carrier.id,
      categoryType: "savings" as const,
      amount,
      occurredAt,
      description: "Transfer",
      paymentMethod: "bank_transfer" as const,
      source,
      voiceNotePath: null,
      voiceTranscript: null,
      transferId,
    };

    const outLeg = Transaction.create({
      ...common,
      id: asTransactionId(this.ids.next()),
      accountId: input.fromAccountId,
      direction: "out",
      receiptPath: input.receiptPath ?? null,
    });
    const inLeg = Transaction.create({
      ...common,
      id: asTransactionId(this.ids.next()),
      accountId: input.toAccountId,
      direction: "in",
      receiptPath: null,
    });

    await this.txns.saveMany([outLeg, inLeg]);
    return ok({ id: inLeg.id });
  }
}
