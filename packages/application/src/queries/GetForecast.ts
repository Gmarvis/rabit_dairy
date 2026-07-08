import { Money, YearMonth, summarise, type UserId } from "@rabbit/domain";
import type { TransactionRepository } from "../ports/repositories.js";
import type { Clock } from "../ports/services.js";
import type { ForecastView } from "./viewmodels.js";

/** How much we suggest trimming the daily pace by, to save more. */
const TRIM = 0.15;

/**
 * Query: a forward-looking read on the month's spending pace — where you'll
 * land if you keep going, and how much MORE you'd save by easing off. Framed
 * to encourage spending less, not to hand out a spending allowance. Anchored on
 * today's real date via the clock.
 */
export class GetForecast {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: UserId, period: YearMonth): Promise<ForecastView> {
    const now = new Date(this.clock.nowIso());
    const realCurrent = YearMonth.fromDate(now);
    const daysInMonth = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();

    const isCurrent = period.equals(realCurrent);
    const isPast =
      period.year < realCurrent.year ||
      (period.year === realCurrent.year && period.month < realCurrent.month);

    const daysElapsed = isCurrent
      ? Math.min(now.getUTCDate(), daysInMonth)
      : isPast
        ? daysInMonth
        : 0;
    const daysLeft = Math.max(0, daysInMonth - daysElapsed);

    const [cur, prev] = await Promise.all([
      this.txns.listByPeriod(userId, period),
      this.txns.listByPeriod(userId, period.previous()),
    ]);
    const s = summarise(cur);
    const spentSoFar = s.expenses;
    const income = s.income;

    const paceMinor = daysElapsed > 0 ? spentSoFar.minor / daysElapsed : 0;
    // Future months can't be projected; past months are already final.
    const projectedSpend = isCurrent ? Money.of(Math.round(paceMinor * daysInMonth)) : spentSoFar;
    const projectedNet = income.minus(projectedSpend);
    const onTrackToSave = projectedNet.minor > 0 ? projectedNet : Money.zero("XAF");

    const suggestedDailyCap = Money.of(Math.round(paceMinor * (1 - TRIM)));
    const saveIfCapped = Money.of(Math.max(0, Math.round(paceMinor * TRIM * daysLeft)));

    const lastExpenses = summarise(prev).expenses;
    const paceVsLastMonth =
      lastExpenses.minor > 0 ? projectedSpend.minor / lastExpenses.minor - 1 : null;

    return {
      periodLabel: `${period.monthName} ${period.year}`,
      isCurrentMonth: isCurrent,
      isPast,
      daysElapsed,
      daysLeft,
      daysInMonth,
      spentSoFar,
      income,
      dailyPace: Money.of(Math.round(paceMinor)),
      projectedSpend,
      projectedNet,
      onTrackToSave,
      suggestedDailyCap,
      saveIfCapped,
      paceVsLastMonth,
    };
  }
}
