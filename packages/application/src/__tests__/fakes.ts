import {
  Account,
  Category,
  Money,
  YearMonth,
  asAccountId,
  asCategoryId,
  asUserId,
  type AccountId,
  type CategoryId,
  type Transaction,
  type TransactionId,
  type UserId,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

export const USER = asUserId("user-1");

export class SeqIds implements IdGenerator {
  private n = 0;
  next() {
    return `id-${++this.n}`;
  }
}

export class FixedClock implements Clock {
  constructor(private iso = "2026-04-15T12:00:00.000Z") {}
  nowIso() {
    return this.iso;
  }
}

export class InMemoryCategories implements CategoryRepository {
  private store = new Map<string, Category>();
  seed(c: Category) {
    this.store.set(c.id, c);
    return this;
  }
  async findById(_u: UserId, id: CategoryId) {
    return this.store.get(id) ?? null;
  }
  async listAll() {
    return [...this.store.values()];
  }
  async save(c: Category) {
    this.store.set(c.id, c);
  }
}

export class InMemoryTransactions implements TransactionRepository {
  store = new Map<string, Transaction>();
  async findById(_u: UserId, id: TransactionId) {
    return this.store.get(id) ?? null;
  }
  async listByPeriod(_u: UserId, period: YearMonth) {
    return [...this.store.values()]
      .filter((t) => period.containsIso(t.occurredAt))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }
  async listByAccount(_u: UserId, accountId: AccountId, limit?: number) {
    const rows = [...this.store.values()]
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return limit ? rows.slice(0, limit) : rows;
  }
  async save(t: Transaction) {
    this.store.set(t.id, t);
  }
  async saveMany(ts: readonly Transaction[]) {
    for (const t of ts) this.store.set(t.id, t);
  }
  async delete(_u: UserId, id: TransactionId) {
    this.store.delete(id);
  }
}

export class InMemoryAccounts implements AccountRepository {
  private store = new Map<string, Account>();
  constructor(private txns: InMemoryTransactions) {}
  seed(a: Account) {
    this.store.set(a.id, a);
    return this;
  }
  async findById(_u: UserId, id: AccountId) {
    return this.store.get(id) ?? null;
  }
  async listAll() {
    return [...this.store.values()];
  }
  async netMovementOf(_u: UserId, id: AccountId) {
    return [...this.txns.store.values()]
      .filter((t) => t.accountId === id)
      .reduce((acc, t) => acc.plus(t.signedAmount), Money.zero("XAF"));
  }
  async save(a: Account) {
    this.store.set(a.id, a);
  }
}

export function salaryCategory(): Category {
  return Category.create({
    id: asCategoryId("cat-salary"),
    userId: USER,
    name: "Salary (Net)",
    type: "income",
    color: "#26A876",
    defaultPaymentMethod: "bank_transfer",
    isArchived: false,
  });
}

export function groceriesCategory(): Category {
  return Category.create({
    id: asCategoryId("cat-groceries"),
    userId: USER,
    name: "Groceries & Food",
    type: "variable_expense",
    color: "#D95A4E",
    defaultPaymentMethod: "cash",
    isArchived: false,
  });
}

export function salaryAccount(): Account {
  return Account.create({
    id: asAccountId("acc-salary"),
    userId: USER,
    name: "Salary account",
    type: "bank_salary",
    currency: "XAF",
    institution: "Afriland",
    mask: "4821",
    openingBalance: Money.zero("XAF"),
    isPrimary: true,
    isDormant: false,
  });
}
