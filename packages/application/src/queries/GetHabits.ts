import {
  Money,
  YearMonth,
  summarise,
  type Category,
  type Transaction,
  type UserId,
} from "@rabbit/domain";
import type {
  BudgetRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";
import type { Clock } from "../ports/services.js";
import type { HabitsView, SpendGoalHabit } from "./viewmodels.js";

/** How many months of history we look back over for the monthly streaks. */
const WINDOW = 12;

type Verdict = "yes" | "no" | "skip";

/** Longest run of consecutive calendar dates present in the set. */
function bestDayRun(dayKeys: Set<string>): number {
  const days = [...dayKeys].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const d = new Date(`${key}T00:00:00Z`);
    if (prev && d.getTime() - prev.getTime() === 86_400_000) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/**
 * Query: the user's financial habits and streaks — logging, saving, staying on
 * budget, and per-category spend goals. Anchored on today's real date (not the
 * browsed month) so the streaks don't shift as you page through periods.
 */
export class GetHabits {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly budgets: BudgetRepository,
    private readonly categories: CategoryRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: UserId): Promise<HabitsView> {
    const nowIso = this.clock.nowIso();
    const current = YearMonth.fromDate(new Date(nowIso));

    // Trailing window of months, oldest → newest (last = current month).
    const periods: YearMonth[] = [];
    let p = current;
    for (let i = 0; i < WINDOW; i++) {
      periods.unshift(p);
      p = p.previous();
    }
    const last = WINDOW - 1; // index of the current (in-progress) month

    const [txnsByMonth, budgetsByMonth, cats] = await Promise.all([
      Promise.all(periods.map((ym) => this.txns.listByPeriod(userId, ym))),
      Promise.all(periods.map((ym) => this.budgets.listByPeriod(userId, ym))),
      this.categories.listAll(userId),
    ]);

    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const summaries = txnsByMonth.map((rows) => summarise(rows));

    // Per-month, per-category actual spend (expenses only) and budget target.
    const actualByCat = txnsByMonth.map((rows) => {
      const m = new Map<string, Money>();
      for (const t of rows.filter((x: Transaction) => x.isExpense)) {
        m.set(t.categoryId, (m.get(t.categoryId) ?? Money.zero("XAF")).plus(t.amount));
      }
      return m;
    });
    const budgetByCat = budgetsByMonth.map((rows) => {
      const m = new Map<string, Money>();
      for (const b of rows) m.set(b.categoryId, b.amount);
      return m;
    });

    // ---- Logging streak (days) ----
    const dayKeys = new Set<string>();
    let lastLoggedAt: string | null = null;
    for (const rows of txnsByMonth) {
      for (const t of rows) {
        const iso = new Date(t.occurredAt).toISOString();
        dayKeys.add(iso.slice(0, 10));
        if (!lastLoggedAt || t.occurredAt > lastLoggedAt) lastLoggedAt = t.occurredAt;
      }
    }
    const today = new Date(nowIso);
    today.setUTCHours(0, 0, 0, 0);
    const keyOf = (d: Date) => d.toISOString().slice(0, 10);
    const has = (d: Date) => dayKeys.has(keyOf(d));

    let loggingCurrent = 0;
    const cursor = new Date(today);
    if (!has(cursor)) cursor.setUTCDate(cursor.getUTCDate() - 1); // yesterday keeps it alive
    while (has(cursor)) {
      loggingCurrent++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    const loggedToday = has(today);

    // ---- Monthly streak helpers (completed months only: 0..last-1) ----
    const monthStreak = (verdict: (i: number) => Verdict): number => {
      let s = 0;
      for (let i = last - 1; i >= 0; i--) {
        const v = verdict(i);
        if (v === "yes") s++;
        else if (v === "no") break;
      }
      return s;
    };
    const monthBest = (verdict: (i: number) => Verdict): number => {
      let best = 0;
      let run = 0;
      for (let i = 0; i < last; i++) {
        const v = verdict(i);
        if (v === "yes") { run++; best = Math.max(best, run); }
        else if (v === "no") run = 0;
      }
      return best;
    };

    // ---- Savings streak: a month "counts" when you set money aside or came out ahead. ----
    const savedIn = (i: number): Verdict =>
      summaries[i]!.savings.minor > 0 || summaries[i]!.netBalance.minor > 0 ? "yes" : "no";

    // ---- Budget adherence: total spent in budgeted categories ≤ total budget. ----
    const budgetVerdict = (i: number): Verdict => {
      const budgeted = budgetByCat[i]!;
      if (budgeted.size === 0) return "skip";
      let target = Money.zero("XAF");
      let spent = Money.zero("XAF");
      for (const [catId, amount] of budgeted) {
        target = target.plus(amount);
        spent = spent.plus(actualByCat[i]!.get(catId) ?? Money.zero("XAF"));
      }
      return spent.minor <= target.minor ? "yes" : "no";
    };
    const hasBudget = budgetByCat.some((m) => m.size > 0);

    // ---- Per-category spend goals: this month's budgets are the goals. ----
    const goals: SpendGoalHabit[] = [...budgetByCat[last]!.entries()].map(
      ([catId, target]) => {
        const spent = actualByCat[last]!.get(catId) ?? Money.zero("XAF");
        const verdict = (i: number): Verdict => {
          const b = budgetByCat[i]!.get(catId);
          if (!b) return "skip";
          return (actualByCat[i]!.get(catId) ?? Money.zero("XAF")).minor <= b.minor
            ? "yes"
            : "no";
        };
        const cat = catById.get(catId);
        return {
          categoryId: catId,
          categoryName: cat?.name ?? "—",
          categoryColor: cat?.color ?? "#888888",
          target,
          spent,
          current: monthStreak(verdict),
          onTrack: spent.minor <= target.minor,
        };
      },
    );
    goals.sort((a, b) => b.current - a.current || b.target.minor - a.target.minor);

    return {
      logging: {
        current: loggingCurrent,
        best: bestDayRun(dayKeys),
        active: loggingCurrent > 0,
        loggedToday,
        lastLoggedAt,
      },
      savings: {
        current: monthStreak(savedIn),
        best: monthBest(savedIn),
        active: savedIn(last) === "yes",
        thisMonthNet: summaries[last]!.netBalance,
        onTrack: savedIn(last) === "yes",
      },
      budget: {
        current: monthStreak(budgetVerdict),
        best: monthBest(budgetVerdict),
        active: budgetVerdict(last) === "yes",
        hasBudget,
        thisMonthUnder: budgetVerdict(last) === "yes",
      },
      goals,
    };
  }
}
