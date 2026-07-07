/**
 * Composition root — wires the application-layer use cases to a data source.
 * Uses Supabase when configured, otherwise the in-memory demo data so the UI
 * runs immediately. Screens depend only on this, never on infra directly.
 */
import { asUserId, type UserId } from "@rabbit/domain";
import {
  GetAccountsOverview,
  GetBudgetVsActual,
  GetDashboard,
  GetEntryOptions,
  LogTransaction,
  RecordSavingsMovement,
  SetBudget,
} from "@rabbit/application";
import {
  SupabaseAccountRepository,
  SupabaseBudgetRepository,
  SupabaseCategoryRepository,
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

  return {
    userId,
    isDemo: !useSupabase,
    queries: {
      dashboard: new GetDashboard(txns, categories, accounts),
      accounts: new GetAccountsOverview(accounts),
      budgetVsActual: new GetBudgetVsActual(txns, budgets, categories),
      entryOptions: new GetEntryOptions(categories, accounts),
    },
    commands: {
      logTransaction: new LogTransaction(txns, categories, ids, clock),
      recordSavings: new RecordSavingsMovement(txns, ids, clock),
      setBudget: new SetBudget(budgets, ids),
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
