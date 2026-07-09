/**
 * Composition root — wires the application-layer use cases to Supabase. Screens
 * depend only on this, never on infra directly.
 */
import { asUserId, type UserId } from "@rabbit/domain";
import type { FileStorage } from "@rabbit/application";
import {
  ArchiveCategory,
  CreateAccount,
  DeleteTransaction,
  EditTransaction,
  GetAccountLedger,
  GetAccountsOverview,
  GetBudgets,
  GetBudgetVsActual,
  GetCalendar,
  GetCategories,
  GetDashboard,
  GetEntryOptions,
  GetExportRows,
  GetCashFlow,
  GetForecast,
  GetHabits,
  GetLifetime,
  GetMonthlyReport,
  GetNetWorthTrend,
  GetNudges,
  GetRecentTransactions,
  GetSpendingReport,
  GetTransaction,
  GetYearlyOverview,
  ImportStatement,
  LogTransaction,
  ReconcileAccountBalance,
  RecordSavingsMovement,
  SaveCategory,
  SetBudget,
} from "@rabbit/application";
import {
  SupabaseAccountRepository,
  SupabaseBudgetRepository,
  SupabaseCategoryRepository,
  SupabaseFileStorage,
  SupabaseTransactionRepository,
  SystemClock,
  UuidIds,
} from "@rabbit/infra";
import { supabase } from "./supabase";

function build(userId: UserId) {
  if (!supabase) {
    throw new Error("Supabase is not configured — set your keys in .env.");
  }
  const accounts = new SupabaseAccountRepository(supabase);
  const categories = new SupabaseCategoryRepository(supabase);
  const txns = new SupabaseTransactionRepository(supabase);
  const budgets = new SupabaseBudgetRepository(supabase);

  const ids = new UuidIds();
  const clock = new SystemClock();

  const storage: FileStorage = new SupabaseFileStorage(supabase, userId, ids);

  return {
    userId,
    storage,
    queries: {
      dashboard: new GetDashboard(txns, categories, accounts),
      accounts: new GetAccountsOverview(accounts),
      accountLedger: new GetAccountLedger(accounts, txns, categories),
      budgetVsActual: new GetBudgetVsActual(txns, budgets, categories),
      monthlyReport: new GetMonthlyReport(txns, categories),
      yearlyOverview: new GetYearlyOverview(txns),
      cashFlow: new GetCashFlow(txns),
      netWorthTrend: new GetNetWorthTrend(txns, accounts),
      habits: new GetHabits(txns, budgets, categories, clock),
      calendar: new GetCalendar(txns, categories, accounts),
      recentTransactions: new GetRecentTransactions(txns, categories, accounts),
      nudges: new GetNudges(txns, budgets, categories),
      forecast: new GetForecast(txns, clock),
      lifetime: new GetLifetime(txns, accounts),
      spendingReport: new GetSpendingReport(txns, categories, accounts),
      entryOptions: new GetEntryOptions(categories, accounts),
      budgets: new GetBudgets(budgets, categories),
      categories: new GetCategories(categories),
      exportRows: new GetExportRows(txns, categories, accounts),
      transaction: new GetTransaction(txns, categories, accounts),
    },
    commands: {
      logTransaction: new LogTransaction(txns, categories, ids, clock),
      editTransaction: new EditTransaction(txns, categories),
      deleteTransaction: new DeleteTransaction(txns),
      recordSavings: new RecordSavingsMovement(txns, ids, clock),
      setBudget: new SetBudget(budgets, ids),
      createAccount: new CreateAccount(accounts, ids),
      reconcileBalance: new ReconcileAccountBalance(accounts),
      importStatement: new ImportStatement(txns, categories, ids, clock),
      saveCategory: new SaveCategory(categories, ids),
      archiveCategory: new ArchiveCategory(categories),
    },
  };
}

export type Container = ReturnType<typeof build>;

let cached: Container | null = null;

/** The active container, bound to the signed-in user. */
export function getContainer(sessionUserId?: string): Container {
  // Signed-out screens redirect to Welcome before they query, so an empty id is
  // only ever a placeholder — Supabase RLS returns nothing for it anyway.
  const userId = asUserId(sessionUserId ?? "");
  if (!cached || cached.userId !== userId) cached = build(userId);
  return cached;
}
