/**
 * Hand-written row shapes for the Supabase tables (see supabase/migrations).
 * Replace with `supabase gen types typescript` output once the project is live.
 */
import type {
  AccountType,
  CategoryType,
  Direction,
  PaymentMethod,
  TransactionSource,
} from "@rabbit/domain";

export interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  institution: string | null;
  mask: string | null;
  opening_balance: number;
  is_primary: boolean;
  is_dormant: boolean;
}

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string;
  default_payment_method: PaymentMethod | null;
  is_archived: boolean;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  category_type: CategoryType;
  direction: Direction;
  amount: number;
  currency: string;
  occurred_at: string;
  description: string | null;
  payment_method: PaymentMethod | null;
  source: TransactionSource;
  voice_note_path: string | null;
  voice_transcript: string | null;
  receipt_path: string | null;
  transfer_id: string | null;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number;
}
