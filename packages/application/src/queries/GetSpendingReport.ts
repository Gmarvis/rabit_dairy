import {
  Money,
  type Account,
  type Category,
  type PaymentMethod,
  type Transaction,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { BreakdownSlice, SpendingReportView, TopSpendItem } from "./viewmodels.js";

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_card: "Bank Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

/** Sum expense amounts keyed by some field. */
function sumBy(rows: Transaction[], key: (t: Transaction) => string): Map<string, Money> {
  const totals = new Map<string, Money>();
  for (const t of rows) {
    if (!t.isExpense) continue;
    const k = key(t);
    totals.set(k, (totals.get(k) ?? Money.zero("XAF")).plus(t.amount));
  }
  return totals;
}

/**
 * Query: this month's spending sliced by category, account and payment method,
 * each with its share of the total; categories also carry a month-over-month
 * delta. Plus the biggest single spends.
 */
export class GetSpendingReport {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(userId: UserId, period: YearMonth): Promise<SpendingReportView> {
    const [rows, prevRows, cats, accs] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.txns.listByPeriod(userId, period.previous()),
      this.categories.listAll(userId),
      this.accounts.listAll(userId),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const accById = new Map<string, Account>(accs.map((a) => [a.id, a]));

    // By category (+ MoM vs previous month's same category).
    const catTotals = sumBy(rows, (t) => t.categoryId);
    const prevCatTotals = sumBy(prevRows, (t) => t.categoryId);
    const totalExpenses = [...catTotals.values()].reduce((a, m) => a.plus(m), Money.zero("XAF"));
    const share = (amount: Money) => (totalExpenses.isZero ? 0 : amount.ratioOf(totalExpenses));

    const byCategory: BreakdownSlice[] = [...catTotals.entries()]
      .map(([categoryId, amount]) => {
        const prev = prevCatTotals.get(categoryId);
        return {
          key: categoryId,
          label: catById.get(categoryId)?.name ?? "—",
          color: catById.get(categoryId)?.color ?? null,
          amount,
          percent: share(amount),
          momDelta: prev && !prev.isZero ? amount.minus(prev).ratioOf(prev) : null,
        };
      })
      .sort((a, b) => b.amount.minor - a.amount.minor);

    const byAccount: BreakdownSlice[] = [...sumBy(rows, (t) => t.accountId).entries()]
      .map(([accountId, amount]) => ({
        key: accountId,
        label: accById.get(accountId)?.name ?? "Account",
        color: null,
        amount,
        percent: share(amount),
        momDelta: null,
      }))
      .sort((a, b) => b.amount.minor - a.amount.minor);

    const byMethod: BreakdownSlice[] = [...sumBy(rows, (t) => t.paymentMethod ?? "other").entries()]
      .map(([method, amount]) => ({
        key: method,
        label: METHOD_LABEL[method as PaymentMethod] ?? "Other",
        color: null,
        amount,
        percent: share(amount),
        momDelta: null,
      }))
      .sort((a, b) => b.amount.minor - a.amount.minor);

    const topSpends: TopSpendItem[] = rows
      .filter((t) => t.isExpense)
      .sort((a, b) => b.amount.minor - a.amount.minor)
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.description ?? catById.get(t.categoryId)?.name ?? "Expense",
        categoryName: catById.get(t.categoryId)?.name ?? "—",
        categoryColor: catById.get(t.categoryId)?.color ?? "#888888",
        occurredAt: t.occurredAt,
        amount: t.amount,
      }));

    return {
      periodLabel: `${period.monthName} ${period.year}`,
      totalExpenses,
      byCategory,
      byAccount,
      byMethod,
      topSpends,
    };
  }
}
