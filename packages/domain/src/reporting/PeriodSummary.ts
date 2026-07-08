import { Money, sumMoney, type CurrencyCode } from "../shared/Money.js";
import type { Transaction } from "../transaction/Transaction.js";

/**
 * The headline figures for a period — the same numbers the spreadsheet's
 * Dashboard and Monthly Report compute, but derived from transactions.
 *
 * Savings here means transactions whose category type is "savings"
 * (money deliberately set aside), matching the sheet.
 */
export interface PeriodSummary {
  income: Money;
  expenses: Money;
  savings: Money;
  /** income − expenses − savings. */
  netBalance: Money;
  /** savings / income. */
  savingsRate: number;
  /** expenses / income. */
  expenseRate: number;
  transactionCount: number;
}

export function summarise(
  txns: readonly Transaction[],
  currency: CurrencyCode = "XAF",
): PeriodSummary {
  // The credit side of an internal transfer (e.g. moving cash into a savings
  // account) carries a transferId. It isn't income, spending or fresh saving —
  // it's the same money changing pockets — so it's left out of the P&L totals.
  const real = txns.filter((t) => t.transferId === null);
  const income = sumMoney(
    real.filter((t) => t.categoryType === "income").map((t) => t.amount),
    currency,
  );
  const expenses = sumMoney(
    real.filter((t) => t.isExpense).map((t) => t.amount),
    currency,
  );
  const savings = sumMoney(
    real.filter((t) => t.categoryType === "savings").map((t) => t.amount),
    currency,
  );
  const netBalance = income.minus(expenses).minus(savings);
  return {
    income,
    expenses,
    savings,
    netBalance,
    savingsRate: savings.ratioOf(income),
    expenseRate: expenses.ratioOf(income),
    transactionCount: real.length,
  };
}
