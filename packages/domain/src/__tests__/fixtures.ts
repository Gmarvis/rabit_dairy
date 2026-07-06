import { Money } from "../shared/Money.js";
import { Transaction } from "../transaction/Transaction.js";
import type { CategoryType, PaymentMethod } from "../category/Category.js";
import { defaultDirection } from "../category/Category.js";
import {
  asAccountId,
  asCategoryId,
  asTransactionId,
  asUserId,
} from "../shared/ids.js";

const USER = asUserId("u1");
const ACC = asAccountId("acc-salary");
let seq = 0;

/** Terse helper to build a Transaction for tests. */
export function txn(
  amountMajor: number,
  categoryType: CategoryType,
  opts: { method?: PaymentMethod; date?: string; direction?: "in" | "out" } = {},
): Transaction {
  return Transaction.create({
    id: asTransactionId(`t${++seq}`),
    userId: USER,
    accountId: ACC,
    categoryId: asCategoryId(categoryType),
    categoryType,
    direction: opts.direction ?? defaultDirection(categoryType),
    amount: Money.fromMajor(amountMajor, "XAF"),
    occurredAt: opts.date ?? "2026-04-02T09:00:00.000Z",
    description: null,
    paymentMethod: opts.method ?? "cash",
    source: "manual",
    voiceNotePath: null,
    voiceTranscript: null,
    receiptPath: null,
    transferId: null,
  });
}

/** The real April 2026 transactions from rabbit_dairy_v7.xlsx. */
export const april2026 = () => [
  txn(811_821, "income", { method: "bank_transfer", date: "2026-04-01T00:00:00Z" }),
  txn(40_500, "variable_expense", { method: "mobile_money", date: "2026-04-02T00:00:00Z" }),
  txn(150_000, "business_cost", { date: "2026-04-03T00:00:00Z" }),
  txn(350_000, "fixed_expense", { date: "2026-04-04T00:00:00Z" }),
  txn(11_200, "variable_expense", { date: "2026-04-04T00:00:00Z" }),
  txn(12_500, "variable_expense", { date: "2026-04-03T00:00:00Z" }),
];

/** March 2026 — includes a 400,000 savings contribution. */
export const march2026 = () => [
  txn(880_000, "income", { method: "bank_transfer", date: "2026-03-02T00:00:00Z" }),
  txn(400_000, "savings", { method: "bank_transfer", date: "2026-03-02T00:00:00Z" }),
  txn(225_000, "fixed_expense", { date: "2026-03-02T00:00:00Z" }),
  txn(30_000, "fixed_expense", { date: "2026-03-02T00:00:00Z" }),
  txn(90_000, "variable_expense", { date: "2026-03-01T00:00:00Z" }),
];
