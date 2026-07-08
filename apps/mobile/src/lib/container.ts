/**
 * Composition root — wires the application-layer use cases to a data source.
 * Uses Supabase when configured, otherwise the in-memory demo data so the UI
 * runs immediately. Screens depend only on this, never on infra directly.
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
  GetCategories,
  GetDashboard,
  GetEntryOptions,
  GetExportRows,
  GetCashFlow,
  GetHabits,
  GetMonthlyReport,
  GetNetWorthTrend,
  GetSpendingReport,
  GetTransaction,
  GetYearlyOverview,
  ImportStatement,
  LogTransaction,
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
import { isSupabaseConfigured, supabase } from "./supabase";
import {
  DEMO_USER_ID,
  demoAccounts,
  demoBudgets,
  demoCategories,
  demoTransactions,
} from "../data/demo";

function build(userId: UserId) {
  const useSupabase = isSupabaseConfigured && supabase;
  const accounts = useSupabase ? new SupabaseAccountRepository(supabase!) : demoAccounts;
  const categories = useSupabase ? new SupabaseCategoryRepository(supabase!) : demoCategories;
  const txns = useSupabase ? new SupabaseTransactionRepository(supabase!) : demoTransactions;
  const budgets = useSupabase ? new SupabaseBudgetRepository(supabase!) : demoBudgets;

  const ids = new UuidIds();
  const clock = new SystemClock();

  // Uploads to Supabase Storage when live; in demo mode keeps the local file uri.
  const storage: FileStorage =
    useSupabase && supabase
      ? new SupabaseFileStorage(supabase, userId, ids)
      : { async upload(_bucket, localUri) { return { path: localUri }; } };

  return {
    userId,
    isDemo: !useSupabase,
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
      importStatement: new ImportStatement(txns, categories, ids, clock),
      saveCategory: new SaveCategory(categories, ids),
      archiveCategory: new ArchiveCategory(categories),
    },
  };
}

export type Container = ReturnType<typeof build>;

let cached: Container | null = null;

/** The active container. In demo mode the user id is fixed. */
export function getContainer(sessionUserId?: string): Container {
  const userId = sessionUserId ? asUserId(sessionUserId) : DEMO_USER_ID;
  if (!cached || cached.userId !== userId) cached = build(userId);
  return cached;
}
