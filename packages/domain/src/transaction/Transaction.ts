import { Money } from "../shared/Money.js";
import type { CategoryType, PaymentMethod } from "../category/Category.js";
import type {
  AccountId,
  CategoryId,
  TransactionId,
  TransferId,
  UserId,
} from "../shared/ids.js";

/** Effect on the owning account's balance. */
export type Direction = "in" | "out";

/** How the entry got into the app — powers the tags in the ledger UI. */
export type TransactionSource = "manual" | "voice" | "scan" | "receipt";

export interface TransactionProps {
  id: TransactionId;
  userId: UserId;
  accountId: AccountId;
  categoryId: CategoryId;
  /** Denormalised from the category for fast reporting; kept in sync on write. */
  categoryType: CategoryType;
  direction: Direction;
  /** Always stored positive; `signedAmount` applies the direction. */
  amount: Money;
  /** ISO datetime (UTC) the money moved. */
  occurredAt: string;
  description: string | null;
  paymentMethod: PaymentMethod | null;
  source: TransactionSource;
  /** Storage path of the spoken "why", when recorded by voice. */
  voiceNotePath: string | null;
  /** Transcription of the voice note, cached for search/display. */
  voiceTranscript: string | null;
  /** Storage path of a receipt / statement crop, when scanned. */
  receiptPath: string | null;
  /** Links the two legs of a transfer (e.g. salary → savings). */
  transferId: TransferId | null;
}

export class Transaction {
  private constructor(private props: TransactionProps) {}

  static create(
    props: Omit<TransactionProps, "amount"> & { amount: Money },
  ): Transaction {
    if (props.amount.isNegative) {
      throw new Error("Transaction amount must be stored positive");
    }
    if (props.amount.isZero) {
      throw new Error("Transaction amount must be greater than zero");
    }
    return new Transaction({ ...props, description: props.description?.trim() || null });
  }

  get id() { return this.props.id; }
  get accountId() { return this.props.accountId; }
  get categoryId() { return this.props.categoryId; }
  get categoryType() { return this.props.categoryType; }
  get direction() { return this.props.direction; }
  get amount() { return this.props.amount; }
  get occurredAt() { return this.props.occurredAt; }
  get description() { return this.props.description; }
  get paymentMethod() { return this.props.paymentMethod; }
  get source() { return this.props.source; }
  get voiceNotePath() { return this.props.voiceNotePath; }
  get voiceTranscript() { return this.props.voiceTranscript; }
  get receiptPath() { return this.props.receiptPath; }
  get transferId() { return this.props.transferId; }

  /** Positive when money comes in, negative when it goes out. */
  get signedAmount(): Money {
    return this.props.direction === "in"
      ? this.props.amount
      : this.props.amount.negated();
  }

  get isExpense(): boolean {
    return (
      this.props.categoryType === "fixed_expense" ||
      this.props.categoryType === "variable_expense" ||
      this.props.categoryType === "business_cost"
    );
  }

  get isIncome(): boolean {
    return this.props.categoryType === "income";
  }

  attachVoiceNote(path: string, transcript: string | null): void {
    this.props.voiceNotePath = path;
    this.props.voiceTranscript = transcript;
  }

  attachReceipt(path: string): void {
    this.props.receiptPath = path;
  }

  snapshot(): Readonly<TransactionProps> { return { ...this.props }; }
}

/**
 * Net movement (signed) of a set of transactions belonging to one account —
 * the input to `Account.balance()`.
 */
export function netMovement(
  txns: readonly Transaction[],
  currency = "XAF" as const,
): Money {
  return txns.reduce((acc, t) => acc.plus(t.signedAmount), Money.zero(currency));
}
