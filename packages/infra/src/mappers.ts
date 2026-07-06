import {
  Account,
  Budget,
  Category,
  Money,
  Transaction,
  asAccountId,
  asBudgetId,
  asCategoryId,
  asTransactionId,
  asTransferId,
  asUserId,
  type CurrencyCode,
} from "@rabbit/domain";
import type {
  AccountRow,
  BudgetRow,
  CategoryRow,
  TransactionRow,
} from "./database.types.js";

const cur = (c: string) => c as CurrencyCode;

export const toAccount = (r: AccountRow): Account =>
  Account.create({
    id: asAccountId(r.id),
    userId: asUserId(r.user_id),
    name: r.name,
    type: r.type,
    currency: cur(r.currency),
    institution: r.institution,
    mask: r.mask,
    openingBalance: Money.of(r.opening_balance, cur(r.currency)),
    isPrimary: r.is_primary,
    isDormant: r.is_dormant,
  });

export const toCategory = (r: CategoryRow): Category =>
  Category.create({
    id: asCategoryId(r.id),
    userId: asUserId(r.user_id),
    name: r.name,
    type: r.type,
    color: r.color,
    defaultPaymentMethod: r.default_payment_method,
    isArchived: r.is_archived,
  });

export const toTransaction = (r: TransactionRow): Transaction =>
  Transaction.create({
    id: asTransactionId(r.id),
    userId: asUserId(r.user_id),
    accountId: asAccountId(r.account_id),
    categoryId: asCategoryId(r.category_id),
    categoryType: r.category_type,
    direction: r.direction,
    amount: Money.of(r.amount, cur(r.currency)),
    occurredAt: r.occurred_at,
    description: r.description,
    paymentMethod: r.payment_method,
    source: r.source,
    voiceNotePath: r.voice_note_path,
    voiceTranscript: r.voice_transcript,
    receiptPath: r.receipt_path,
    transferId: r.transfer_id ? asTransferId(r.transfer_id) : null,
  });

export const fromTransaction = (t: Transaction): TransactionRow => {
  const s = t.snapshot();
  return {
    id: s.id,
    user_id: s.userId,
    account_id: s.accountId,
    category_id: s.categoryId,
    category_type: s.categoryType,
    direction: s.direction,
    amount: s.amount.minor,
    currency: s.amount.currency,
    occurred_at: s.occurredAt,
    description: s.description,
    payment_method: s.paymentMethod,
    source: s.source,
    voice_note_path: s.voiceNotePath,
    voice_transcript: s.voiceTranscript,
    receipt_path: s.receiptPath,
    transfer_id: s.transferId,
  };
};

export const toBudget = (r: BudgetRow): Budget =>
  Budget.create({
    id: asBudgetId(r.id),
    userId: asUserId(r.user_id),
    categoryId: asCategoryId(r.category_id),
    year: r.year,
    month: r.month,
    amount: Money.of(r.amount, "XAF"),
  });
