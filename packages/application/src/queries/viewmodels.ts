import type {
  AccountType,
  CategoryType,
  Direction,
  Money,
  PaymentMethod,
  PeriodSummary,
  TransactionSource,
} from "@rabbit/domain";

/** The full transaction, as loaded into the edit screen. */
export interface TransactionDetailView {
  id: string;
  amountMajor: number;
  direction: Direction;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryType: CategoryType;
  accountId: string;
  accountName: string;
  occurredAt: string;
  description: string | null;
  paymentMethod: PaymentMethod | null;
  source: TransactionSource;
  voiceTranscript: string | null;
  hasReceipt: boolean;
}

/** A row as shown in the ledger / recent-activity lists. */
export interface TransactionListItem {
  id: string;
  title: string;
  categoryName: string;
  categoryColor: string;
  categoryType: CategoryType;
  accountName: string;
  paymentMethod: PaymentMethod | null;
  occurredAt: string;
  /** Positive in, negative out. */
  signedAmount: Money;
  source: TransactionSource;
  hasVoiceNote: boolean;
  hasReceipt: boolean;
}

export interface DashboardView {
  periodLabel: string;
  summary: PeriodSummary;
  recent: TransactionListItem[];
}

export interface AccountListItem {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  mask: string | null;
  balance: Money;
  isPrimary: boolean;
  isDormant: boolean;
}

export interface AccountsOverview {
  /** Sum of balances excluding dormant accounts. */
  totalBalance: Money;
  accountCount: number;
  dormantCount: number;
  accounts: AccountListItem[];
}

export interface BudgetLine {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  budget: Money;
  actual: Money;
  variance: Money;
  percentUsed: number;
  status: "under" | "at" | "over" | "no_budget";
}

export interface BudgetVsActualView {
  periodLabel: string;
  lines: BudgetLine[];
  totalBudget: Money;
  totalActual: Money;
  /** totalActual / totalBudget. */
  overallPercentUsed: number;
}

export interface CategorySlice {
  categoryName: string;
  color: string;
  amount: Money;
  percentOfExpenses: number;
}

export interface MonthlyReportView {
  periodLabel: string;
  summary: PeriodSummary;
  byCategory: CategorySlice[];
  topExpenses: CategorySlice[];
}

export interface AccountLedgerView {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  mask: string | null;
  balance: Money;
  isPrimary: boolean;
  isDormant: boolean;
  isSavings: boolean;
  /** Running balance over time (oldest → newest) for the sparkline. */
  balanceHistory: number[];
  transactions: TransactionListItem[];
}

export interface BudgetEditorItem {
  categoryId: string;
  name: string;
  color: string;
  type: CategoryType;
  amountMajor: number;
}

export interface BudgetEditorView {
  periodLabel: string;
  items: BudgetEditorItem[];
}

export interface MonthBucket {
  month: number;
  monthName: string;
  income: Money;
  expenses: Money;
  savings: Money;
  net: Money;
}

export interface YearlyOverviewView {
  year: number;
  months: MonthBucket[];
  ytdIncome: Money;
  ytdExpenses: Money;
  ytdSavings: Money;
  ytdNet: Money;
  /** ytdSavings / ytdIncome. */
  savingsRate: number;
  /** Largest single-month income or expense — for scaling the bars. */
  peak: Money;
}
