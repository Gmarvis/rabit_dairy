import {
  Money,
  type Category,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { CalendarDay, CalendarView, TransactionListItem } from "./viewmodels.js";

/** Query: a month's spending laid out day-by-day, for the calendar heatmap. */
export class GetCalendar {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(userId: UserId, period: YearMonth): Promise<CalendarView> {
    const [rows, cats, accs] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.categories.listAll(userId),
      this.accounts.listAll(userId),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const accNameById = new Map(accs.map((a) => [a.id, a.name]));

    // Last calendar day of the month (period.month is 1-based).
    const daysInMonth = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
    const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      spent: Money.zero("XAF"),
      income: Money.zero("XAF"),
      net: Money.zero("XAF"),
      count: 0,
    }));

    for (const t of rows) {
      const d = new Date(t.occurredAt).getUTCDate();
      const cell = days[d - 1];
      if (!cell) continue;
      cell.count += 1;
      if (t.isExpense) cell.spent = cell.spent.plus(t.amount);
      if (t.categoryType === "income") cell.income = cell.income.plus(t.amount);
      cell.net = cell.net.plus(t.signedAmount);
    }

    const transactions: TransactionListItem[] = rows.map((t) => {
      const cat = catById.get(t.categoryId);
      return {
        id: t.id,
        title: t.description ?? cat?.name ?? "Transaction",
        categoryName: cat?.name ?? "—",
        categoryColor: cat?.color ?? "#888888",
        categoryType: t.categoryType,
        accountName: accNameById.get(t.accountId) ?? "—",
        paymentMethod: t.paymentMethod,
        occurredAt: t.occurredAt,
        signedAmount: t.signedAmount,
        source: t.source,
        hasVoiceNote: t.voiceNotePath !== null,
        hasReceipt: t.receiptPath !== null,
      };
    });

    const maxSpent = days.reduce((m, d) => Math.max(m, d.spent.minor), 0);
    const monthSpent = days.reduce((s, d) => s.plus(d.spent), Money.zero("XAF"));
    const monthIncome = days.reduce((s, d) => s.plus(d.income), Money.zero("XAF"));
    let busiestDay: number | null = null;
    let peak = 0;
    for (const d of days) {
      if (d.spent.minor > peak) { peak = d.spent.minor; busiestDay = d.day; }
    }

    return {
      year: period.year,
      month: period.month,
      monthName: period.monthName,
      /** 0 = Sunday … 6 = Saturday, for the leading offset in the grid. */
      firstWeekday: new Date(Date.UTC(period.year, period.month - 1, 1)).getUTCDay(),
      days,
      transactions,
      maxSpent,
      monthSpent,
      monthIncome,
      busiestDay,
    };
  }
}
