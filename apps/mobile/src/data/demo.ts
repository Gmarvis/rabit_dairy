/**
 * In-memory demo data — spreadsheet figures anchored to the *current* month so
 * the dashboard is never empty — behind the same application ports. Lets the UI
 * run before Supabase is wired.
 */
import {
  Account,
  Category,
  Money,
  Transaction,
  YearMonth,
  asAccountId,
  asCategoryId,
  asTransactionId,
  asUserId,
  defaultDirection,
  type AccountId,
  type CategoryType,
  type PaymentMethod,
  type TransactionId,
  type UserId,
} from "@rabbit/domain";
import type {
  AccountRepository,
  BudgetRepository,
  CategoryRepository,
  TransactionRepository,
} from "@rabbit/application";

const U = asUserId("demo-user");

interface CatDef { id: string; name: string; type: CategoryType; color: string }
const CATS: CatDef[] = [
  { id: "salary", name: "Salary (Net)", type: "income", color: "#26A876" },
  { id: "rent", name: "Rent / Mortgage", type: "fixed_expense", color: "#C24B3F" },
  { id: "loan", name: "Loan / Debt Repayment", type: "fixed_expense", color: "#A83228" },
  { id: "internet", name: "Internet & Phone", type: "fixed_expense", color: "#E4685C" },
  { id: "groceries", name: "Groceries & Food", type: "variable_expense", color: "#BC8623" },
  { id: "shopping", name: "Shopping / Clothing", type: "variable_expense", color: "#C9922A" },
  { id: "gifts", name: "Gifts & Donations", type: "variable_expense", color: "#E8B44C" },
  { id: "tithe", name: "Tithe / Church Giving", type: "variable_expense", color: "#C99A2E" },
  { id: "savings", name: "Savings Account", type: "savings", color: "#6FA8E8" },
  { id: "equipment", name: "Equipment / Hardware", type: "business_cost", color: "#5B4AA8" },
];

interface AccDef {
  id: string; name: string; type: Account["type"];
  institution: string | null; mask: string | null;
  primary?: boolean; dormant?: boolean; opening?: number;
}
const ACCS: AccDef[] = [
  { id: "acc-salary", name: "Salary account", type: "bank_salary", institution: "Afriland", mask: "4821", primary: true },
  { id: "acc-savings", name: "Savings account", type: "bank_savings", institution: "UBA", mask: "7130", opening: 700_000 },
  { id: "acc-dormant", name: "Dormant account", type: "bank_other", institution: "Ecobank", mask: null, dormant: true },
  { id: "acc-momo", name: "MTN MoMo", type: "mobile_money", institution: "MTN", mask: null, opening: 42_000 },
  { id: "acc-cash", name: "Cash wallet", type: "cash", institution: null, mask: null, opening: 8_000 },
];

/** Anchor demo data to the live current month so the dashboard is never empty. */
const now = new Date();
const thisMonth = YearMonth.fromDate(now);
const lastMonth = thisMonth.previous();
/** ISO date (YYYY-MM-DD) for a given day in a period, clamped to a safe day. */
const on = (p: YearMonth, day: number) =>
  `${p.year}-${String(p.month).padStart(2, "0")}-${String(Math.min(day, 28)).padStart(2, "0")}`;

interface TxnDef {
  amount: number; cat: string; acc: string; date: string;
  method?: PaymentMethod; desc?: string;
  voice?: boolean; receipt?: boolean;
}
const TXNS: TxnDef[] = [
  // This month — drives the dashboard, activity, report and budget screens.
  { amount: 811_821, cat: "salary", acc: "acc-salary", date: on(thisMonth, 1), method: "bank_transfer", desc: "Salary" },
  { amount: 40_500, cat: "shopping", acc: "acc-momo", date: on(thisMonth, 2), method: "mobile_money", desc: "Shopping" },
  { amount: 150_000, cat: "equipment", acc: "acc-momo", date: on(thisMonth, 3), method: "mobile_money", desc: "Carpet & center table", voice: true },
  { amount: 12_500, cat: "gifts", acc: "acc-cash", date: on(thisMonth, 3), method: "cash", desc: "Gift — mum" },
  { amount: 350_000, cat: "loan", acc: "acc-salary", date: on(thisMonth, 4), method: "bank_transfer", desc: "Njangi payback" },
  { amount: 11_200, cat: "groceries", acc: "acc-cash", date: on(thisMonth, 4), method: "cash", desc: "Groceries & Food" },
  { amount: 60_000, cat: "savings", acc: "acc-savings", date: on(thisMonth, 5), method: "bank_transfer", desc: "Monthly savings", receipt: true },
  // Last month — gives the yearly overview a second data point.
  { amount: 811_821, cat: "salary", acc: "acc-salary", date: on(lastMonth, 1), method: "bank_transfer", desc: "Salary" },
  { amount: 120_000, cat: "rent", acc: "acc-salary", date: on(lastMonth, 2), method: "bank_transfer", desc: "Rent" },
  { amount: 48_000, cat: "groceries", acc: "acc-cash", date: on(lastMonth, 10), method: "cash", desc: "Groceries & Food" },
];

let seq = 0;
const mkTxn = (d: TxnDef): Transaction => {
  const cat = CATS.find((c) => c.id === d.cat)!;
  return Transaction.create({
    id: asTransactionId(`demo-t${++seq}`),
    userId: U,
    accountId: asAccountId(d.acc),
    categoryId: asCategoryId(d.cat),
    categoryType: cat.type,
    direction: defaultDirection(cat.type),
    amount: Money.fromMajor(d.amount, "XAF"),
    occurredAt: `${d.date}T09:00:00.000Z`,
    description: d.desc ?? null,
    paymentMethod: d.method ?? "cash",
    source: d.voice ? "voice" : d.receipt ? "receipt" : "manual",
    voiceNotePath: d.voice ? "demo/voice.m4a" : null,
    voiceTranscript: d.voice
      ? "Furnishing the new place — needed a table and rug for the living room."
      : null,
    receiptPath: d.receipt ? "demo/receipt.jpg" : null,
    transferId: null,
  });
};

const categories = new Map<string, Category>(
  CATS.map((c) => [
    c.id,
    Category.create({
      id: asCategoryId(c.id), userId: U, name: c.name, type: c.type,
      color: c.color, defaultPaymentMethod: null, isArchived: false,
    }),
  ]),
);

const accounts = new Map<string, Account>(
  ACCS.map((a) => [
    a.id,
    Account.create({
      id: asAccountId(a.id), userId: U, name: a.name, type: a.type,
      currency: "XAF", institution: a.institution, mask: a.mask,
      openingBalance: Money.fromMajor(a.opening ?? 0, "XAF"),
      isPrimary: a.primary ?? false, isDormant: a.dormant ?? false,
    }),
  ]),
);

const transactions = TXNS.map(mkTxn);

export const DEMO_USER_ID = U;

export const demoCategories: CategoryRepository = {
  async findById(_u, id) { return categories.get(id) ?? null; },
  async listAll() { return [...categories.values()]; },
  async save(c) { categories.set(c.id, c); },
};

export const demoTransactions: TransactionRepository = {
  async findById(_u, id) { return transactions.find((t) => t.id === id) ?? null; },
  async listByPeriod(_u, period: YearMonth) {
    return transactions
      .filter((t) => period.containsIso(t.occurredAt))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  },
  async listAll() {
    return [...transactions].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  },
  async listByAccount(_u, accountId: AccountId, limit?: number) {
    const rows = transactions
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return limit ? rows.slice(0, limit) : rows;
  },
  async save(t) { transactions.push(t); },
  async saveMany(ts) { transactions.push(...ts); },
  async delete(_u, id: TransactionId) {
    const i = transactions.findIndex((t) => t.id === id);
    if (i >= 0) transactions.splice(i, 1);
  },
};

export const demoAccounts: AccountRepository = {
  async findById(_u, id) { return accounts.get(id) ?? null; },
  async listAll() { return [...accounts.values()]; },
  async netMovementOf(_u, id: AccountId) {
    return transactions
      .filter((t) => t.accountId === id)
      .reduce((acc, t) => acc.plus(t.signedAmount), Money.zero("XAF"));
  },
  async save(a) { accounts.set(a.id, a); },
};

export const demoBudgets: BudgetRepository = {
  async listByPeriod() { return []; },
  async findFor() { return null; },
  async save() {},
};

export const _unusedUserId: UserId = U;
