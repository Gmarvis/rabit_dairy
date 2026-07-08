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
  /** Total money across all non-dormant accounts, right now. */
  netWorth: Money;
  /** Change in that total during this period (signed). */
  netWorthChange: Money;
  accountCount: number;
  dormantCount: number;
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

/** One month in the cash-flow series. */
export interface CashFlowMonth {
  /** 1–12. */
  month: number;
  /** Short label like "Apr". */
  label: string;
  income: Money;
  expenses: Money;
  /** income − expenses. */
  net: Money;
  /** savings ÷ income for the month. */
  savingsRate: number;
}

export interface CashFlowView {
  /** Oldest → newest. */
  months: CashFlowMonth[];
  totalIncome: Money;
  totalExpenses: Money;
  totalNet: Money;
  /** Latest month's savings rate. */
  savingsRate: number;
  /** Latest vs previous month, as a ratio change (e.g. +0.32 = up 32%); null if no prior. */
  incomeMoM: number | null;
  expensesMoM: number | null;
  /** Tallest income/expense bar, for scaling the chart. */
  peak: Money;
}

export type BreakdownDimension = "category" | "account" | "method";

export interface BreakdownSlice {
  key: string;
  label: string;
  /** Category colour, or null when the view should assign one (account/method). */
  color: string | null;
  amount: Money;
  /** Share of the dimension total (0–1). */
  percent: number;
  /** Month-over-month change vs the same slice last month; null if new/unknown. */
  momDelta: number | null;
}

export interface TopSpendItem {
  id: string;
  title: string;
  categoryName: string;
  categoryColor: string;
  occurredAt: string;
  /** Positive magnitude. */
  amount: Money;
}

export interface SpendingReportView {
  periodLabel: string;
  totalExpenses: Money;
  byCategory: BreakdownSlice[];
  byAccount: BreakdownSlice[];
  byMethod: BreakdownSlice[];
  topSpends: TopSpendItem[];
}

export interface CategoryRow {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  defaultPaymentMethod: PaymentMethod | null;
}

export interface CategoryGroup {
  type: CategoryType;
  /** Human label for the type, e.g. "Variable expense". */
  label: string;
  items: CategoryRow[];
}

export interface CategoriesView {
  groups: CategoryGroup[];
  /** Count of active categories. */
  total: number;
  /** Number of types that have at least one category. */
  typeCount: number;
}

export interface NetWorthPoint {
  /** Short month label, e.g. "Apr". */
  label: string;
  value: Money;
}

export interface NetWorthTrendView {
  /** Oldest → newest; the last point is the live total. */
  points: NetWorthPoint[];
  current: Money;
  /** current − first point (signed). */
  change: Money;
  /** change ÷ first point; null when the first point is zero. */
  changePct: number | null;
  /** Min/max in minor units, for scaling the sparkline. */
  min: number;
  max: number;
}

export type NudgeTone = "alert" | "warn" | "info" | "positive";

export interface Nudge {
  id: string;
  kind:
    | "over_budget"
    | "overspend_category"
    | "spending_up"
    | "large_spend"
    | "on_track";
  tone: NudgeTone;
  /** Ionicons glyph name for the UI. */
  icon: string;
  title: string;
  body: string;
}

export interface NudgesView {
  items: Nudge[];
}

export interface CalendarDay {
  /** Day of month, 1-based. */
  day: number;
  spent: Money;
  income: Money;
  /** Signed net for the day. */
  net: Money;
  count: number;
}

export interface CalendarView {
  year: number;
  month: number;
  monthName: string;
  /** Weekday (0=Sun…6=Sat) the 1st falls on, for the grid offset. */
  firstWeekday: number;
  days: CalendarDay[];
  transactions: TransactionListItem[];
  /** Largest single-day spend in minor units, for heat scaling. */
  maxSpent: number;
  monthSpent: Money;
  monthIncome: Money;
  /** Day of month with the highest spend, or null. */
  busiestDay: number | null;
}

export interface StreakStat {
  /** Current unbroken run. */
  current: number;
  /** Longest run seen in the look-back window. */
  best: number;
  /** Whether the streak is alive right now. */
  active: boolean;
}

export interface LoggingHabit extends StreakStat {
  loggedToday: boolean;
  lastLoggedAt: string | null;
}

export interface SavingsHabit extends StreakStat {
  /** This month's net balance so far. */
  thisMonthNet: Money;
  /** Whether this month already qualifies. */
  onTrack: boolean;
}

export interface BudgetHabit extends StreakStat {
  /** Whether any budget has ever been set (drives whether we show this). */
  hasBudget: boolean;
  /** Whether this month is under budget so far. */
  thisMonthUnder: boolean;
}

export interface SpendGoalHabit {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  /** This month's budget for the category — the goal. */
  target: Money;
  /** Spent against it so far. */
  spent: Money;
  /** Streak of completed months kept under the goal. */
  current: number;
  onTrack: boolean;
}

export interface HabitsView {
  logging: LoggingHabit;
  savings: SavingsHabit;
  budget: BudgetHabit;
  goals: SpendGoalHabit[];
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
