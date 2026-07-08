import {
  Money,
  YearMonth,
  type Account,
  type AccountId,
  type Budget,
  type Category,
  type CategoryId,
  type Transaction,
  type TransactionId,
  type UserId,
} from "@rabbit/domain";
import type {
  AccountRepository,
  BudgetRepository,
  CategoryRepository,
  TransactionRepository,
} from "@rabbit/application";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountRow,
  BudgetRow,
  CategoryRow,
  TransactionRow,
} from "./database.types.js";
import {
  fromTransaction,
  toAccount,
  toBudget,
  toCategory,
  toTransaction,
} from "./mappers.js";

function periodBounds(p: YearMonth): { start: string; end: string } {
  const mm = String(p.month).padStart(2, "0");
  const start = `${p.year}-${mm}-01T00:00:00.000Z`;
  const n = p.next();
  const nmm = String(n.month).padStart(2, "0");
  return { start, end: `${n.year}-${nmm}-01T00:00:00.000Z` };
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export class SupabaseAccountRepository implements AccountRepository {
  constructor(private db: SupabaseClient) {}

  async findById(userId: UserId, id: AccountId) {
    const row = unwrap<AccountRow | null>(
      await this.db.from("accounts").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    );
    return row ? toAccount(row) : null;
  }

  async listAll(userId: UserId) {
    const rows = unwrap<AccountRow[]>(
      await this.db.from("accounts").select("*").eq("user_id", userId).order("is_dormant"),
    );
    return rows.map(toAccount);
  }

  async netMovementOf(userId: UserId, id: AccountId) {
    const rows = unwrap<Pick<TransactionRow, "amount" | "direction">[]>(
      await this.db
        .from("transactions")
        .select("amount, direction")
        .eq("user_id", userId)
        .eq("account_id", id),
    );
    return rows.reduce(
      (acc, r) =>
        r.direction === "in"
          ? acc.plus(Money.of(r.amount, "XAF"))
          : acc.minus(Money.of(r.amount, "XAF")),
      Money.zero("XAF"),
    );
  }

  async save(a: Account) {
    const s = a.snapshot();
    const row: AccountRow = {
      id: s.id, user_id: s.userId, name: s.name, type: s.type,
      currency: s.currency, institution: s.institution, mask: s.mask,
      opening_balance: s.openingBalance.minor, is_primary: s.isPrimary,
      is_dormant: s.isDormant,
    };
    unwrap(await this.db.from("accounts").upsert(row).select("id"));
  }
}

export class SupabaseCategoryRepository implements CategoryRepository {
  constructor(private db: SupabaseClient) {}

  async findById(userId: UserId, id: CategoryId) {
    const row = unwrap<CategoryRow | null>(
      await this.db.from("categories").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    );
    return row ? toCategory(row) : null;
  }

  async listAll(userId: UserId) {
    const rows = unwrap<CategoryRow[]>(
      await this.db.from("categories").select("*").eq("user_id", userId).order("name"),
    );
    return rows.map(toCategory);
  }

  async save(c: Category) {
    const s = c.snapshot();
    const row: CategoryRow = {
      id: s.id, user_id: s.userId, name: s.name, type: s.type, color: s.color,
      default_payment_method: s.defaultPaymentMethod, is_archived: s.isArchived,
    };
    unwrap(await this.db.from("categories").upsert(row).select("id"));
  }
}

export class SupabaseTransactionRepository implements TransactionRepository {
  constructor(private db: SupabaseClient) {}

  async findById(userId: UserId, id: TransactionId) {
    const row = unwrap<TransactionRow | null>(
      await this.db.from("transactions").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
    );
    return row ? toTransaction(row) : null;
  }

  async listByPeriod(userId: UserId, period: YearMonth) {
    const { start, end } = periodBounds(period);
    const rows = unwrap<TransactionRow[]>(
      await this.db
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("occurred_at", { ascending: false }),
    );
    return rows.map(toTransaction);
  }

  async listAll(userId: UserId) {
    const rows = unwrap<TransactionRow[]>(
      await this.db
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false }),
    );
    return rows.map(toTransaction);
  }

  async listByAccount(userId: UserId, accountId: AccountId, limit?: number) {
    let q = this.db
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("account_id", accountId)
      .order("occurred_at", { ascending: false });
    if (limit) q = q.limit(limit);
    return unwrap<TransactionRow[]>(await q).map(toTransaction);
  }

  async save(t: Transaction) {
    unwrap(await this.db.from("transactions").upsert(fromTransaction(t)).select("id"));
  }

  async saveMany(txns: readonly Transaction[]) {
    if (txns.length === 0) return;
    unwrap(await this.db.from("transactions").upsert(txns.map(fromTransaction)).select("id"));
  }

  async delete(userId: UserId, id: TransactionId) {
    unwrap(await this.db.from("transactions").delete().eq("user_id", userId).eq("id", id).select("id"));
  }
}

export class SupabaseBudgetRepository implements BudgetRepository {
  constructor(private db: SupabaseClient) {}

  async listByPeriod(userId: UserId, period: YearMonth) {
    const rows = unwrap<BudgetRow[]>(
      await this.db
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("year", period.year)
        .eq("month", period.month),
    );
    return rows.map(toBudget);
  }

  async findFor(userId: UserId, categoryId: CategoryId, period: YearMonth) {
    const row = unwrap<BudgetRow | null>(
      await this.db
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("category_id", categoryId)
        .eq("year", period.year)
        .eq("month", period.month)
        .maybeSingle(),
    );
    return row ? toBudget(row) : null;
  }

  async save(b: Budget) {
    const s = b.snapshot();
    const row: BudgetRow = {
      id: s.id, user_id: s.userId, category_id: s.categoryId,
      year: s.year, month: s.month, amount: s.amount.minor,
    };
    unwrap(
      await this.db
        .from("budgets")
        .upsert(row, { onConflict: "user_id,category_id,year,month" })
        .select("id"),
    );
  }
}
