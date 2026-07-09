import type {
  Account,
  AccountId,
  Budget,
  Category,
  CategoryId,
  Money,
  Transaction,
  TransactionId,
  UserId,
  YearMonth,
} from "@rabbit/domain";

/**
 * Ports — the interfaces the application layer needs. The infra layer supplies
 * Supabase-backed implementations; tests supply in-memory fakes. The domain
 * never sees these.
 */

export interface AccountRepository {
  findById(userId: UserId, id: AccountId): Promise<Account | null>;
  listAll(userId: UserId): Promise<Account[]>;
  /** Signed net movement of an account's transactions (in − out). */
  netMovementOf(userId: UserId, id: AccountId): Promise<Money>;
  save(account: Account): Promise<void>;
  delete(userId: UserId, id: AccountId): Promise<void>;
}

export interface CategoryRepository {
  findById(userId: UserId, id: CategoryId): Promise<Category | null>;
  listAll(userId: UserId): Promise<Category[]>;
  save(category: Category): Promise<void>;
}

export interface TransactionRepository {
  findById(userId: UserId, id: TransactionId): Promise<Transaction | null>;
  /** All transactions occurring within a period, newest first. */
  listByPeriod(userId: UserId, period: YearMonth): Promise<Transaction[]>;
  /** Every transaction the user has — for all-time / lifetime totals. */
  listAll(userId: UserId): Promise<Transaction[]>;
  listByAccount(
    userId: UserId,
    accountId: AccountId,
    limit?: number,
  ): Promise<Transaction[]>;
  save(txn: Transaction): Promise<void>;
  saveMany(txns: readonly Transaction[]): Promise<void>;
  delete(userId: UserId, id: TransactionId): Promise<void>;
}

export interface BudgetRepository {
  listByPeriod(userId: UserId, period: YearMonth): Promise<Budget[]>;
  findFor(
    userId: UserId,
    categoryId: CategoryId,
    period: YearMonth,
  ): Promise<Budget | null>;
  save(budget: Budget): Promise<void>;
}
