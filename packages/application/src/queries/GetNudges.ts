import {
  Money,
  summarise,
  type Category,
  type Transaction,
  type UserId,
  type YearMonth,
} from "@rabbit/domain";
import type {
  BudgetRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { Nudge, NudgesView } from "./viewmodels.js";

/** Ignore differences smaller than this (whole FCFA) — avoids noisy nudges. */
const MIN_NOTE = 5_000;

const fmt = (m: Money) => `${m.format({ withCode: false })} FCFA`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

function expenseByCategory(rows: Transaction[]): Map<string, Money> {
  const m = new Map<string, Money>();
  for (const t of rows) {
    if (!t.isExpense) continue;
    m.set(t.categoryId, (m.get(t.categoryId) ?? Money.zero("XAF")).plus(t.amount));
  }
  return m;
}

/**
 * Query: proactive "heads up" nudges for a period — where spending is running
 * hot versus the user's own norm, over budget, unusually large, or, when all
 * is well, a reassuring on-track note. Derived from transactions and budgets;
 * no new storage.
 */
export class GetNudges {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly budgets: BudgetRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(userId: UserId, period: YearMonth): Promise<NudgesView> {
    const prev = [period.previous(), period.previous().previous(), period.previous().previous().previous()];
    const [cur, p1, p2, p3, cats, budgetRows] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.txns.listByPeriod(userId, prev[0]!),
      this.txns.listByPeriod(userId, prev[1]!),
      this.txns.listByPeriod(userId, prev[2]!),
      this.categories.listAll(userId),
      this.budgets.listByPeriod(userId, period),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const name = (id: string) => catById.get(id)?.name ?? "that category";

    const curByCat = expenseByCategory(cur);
    const prevByCat = [p1, p2, p3].map(expenseByCategory);

    const nudges: (Nudge & { severity: number })[] = [];

    // 1. Over budget this month.
    for (const b of budgetRows) {
      const spent = curByCat.get(b.categoryId) ?? Money.zero("XAF");
      if (b.amount.minor > 0 && spent.minor > b.amount.minor) {
        nudges.push({
          id: `budget-${b.categoryId}`,
          kind: "over_budget",
          tone: "alert",
          icon: "alert-circle",
          title: `Over budget on ${name(b.categoryId)}`,
          body: `${fmt(spent)} spent of your ${fmt(b.amount)} plan.`,
          severity: 100 + spent.minor / Math.max(1, b.amount.minor),
        });
      }
    }

    // 2. A category running well above the user's own norm.
    for (const [catId, spent] of curByCat) {
      const history = prevByCat.map((m) => m.get(catId)?.minor ?? 0);
      const withData = history.filter((x) => x > 0);
      if (withData.length === 0) continue;
      const avg = withData.reduce((a, b) => a + b, 0) / withData.length;
      if (avg > 0 && spent.minor >= 2 * avg && spent.minor - avg >= MIN_NOTE) {
        nudges.push({
          id: `spike-${catId}`,
          kind: "overspend_category",
          tone: "warn",
          icon: "trending-up",
          title: `More on ${name(catId)} than usual`,
          body: `${fmt(spent)} this month vs about ${fmt(Money.fromMajor(Math.round(avg), "XAF"))} you normally spend.`,
          severity: 50 + spent.minor / avg,
        });
      }
    }

    // 3. Overall spending up vs last month.
    const curSum = summarise(cur);
    const lastSum = summarise(p1);
    if (lastSum.expenses.minor > 0) {
      const ratio = curSum.expenses.minor / lastSum.expenses.minor;
      if (ratio >= 1.25 && curSum.expenses.minor - lastSum.expenses.minor >= MIN_NOTE) {
        nudges.push({
          id: "spending-up",
          kind: "spending_up",
          tone: "warn",
          icon: "arrow-up-circle",
          title: "Spending is up",
          body: `${pct(ratio - 1)} more than last month so far (${fmt(curSum.expenses)}).`,
          severity: 40 + (ratio - 1) * 10,
        });
      }
    }

    // 4. A large one-off relative to the month's typical spend.
    const expenses = cur.filter((t) => t.isExpense).sort((a, b) => b.amount.minor - a.amount.minor);
    if (expenses.length >= 4) {
      const sortedAsc = [...expenses].sort((a, b) => a.amount.minor - b.amount.minor);
      const median = sortedAsc[Math.floor(sortedAsc.length / 2)]!.amount.minor;
      const big = expenses[0]!;
      if (median > 0 && big.amount.minor >= 3 * median && big.amount.minor >= MIN_NOTE) {
        nudges.push({
          id: `big-${big.id}`,
          kind: "large_spend",
          tone: "info",
          icon: "flash",
          title: "A big one-off",
          body: `${fmt(big.amount)} on ${big.description ?? name(big.categoryId)} — well above your usual.`,
          severity: 20 + big.amount.minor / median,
        });
      }
    }

    nudges.sort((a, b) => b.severity - a.severity);
    const top = nudges.slice(0, 3);

    // 5. If nothing needs attention, a reassuring note (only when there's data).
    if (top.length === 0 && curSum.transactionCount > 0) {
      if (lastSum.expenses.minor > 0 && curSum.expenses.minor < lastSum.expenses.minor) {
        top.push({
          id: "on-track",
          kind: "on_track",
          tone: "positive",
          icon: "checkmark-circle",
          title: "Pacing nicely",
          body: `Spending is ${pct(1 - curSum.expenses.minor / lastSum.expenses.minor)} below last month.`,
          severity: 0,
        });
      } else if (curSum.netBalance.minor >= 0) {
        top.push({
          id: "surplus",
          kind: "on_track",
          tone: "positive",
          icon: "checkmark-circle",
          title: "In the green",
          body: `You're net positive this month by ${fmt(curSum.netBalance)}.`,
          severity: 0,
        });
      }
    }

    return { items: top.map(({ severity: _s, ...n }) => n) };
  }
}
