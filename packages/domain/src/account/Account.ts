import { Money, type CurrencyCode } from "../shared/Money.js";
import type { AccountId, UserId } from "../shared/ids.js";

/** Kinds of place money sits. Mirrors the user's real setup. */
export type AccountType =
  | "bank_salary"
  | "bank_savings"
  | "bank_other"
  | "mobile_money"
  | "cash";

export const ACCOUNT_TYPES: readonly AccountType[] = [
  "bank_salary",
  "bank_savings",
  "bank_other",
  "mobile_money",
  "cash",
];

/**
 * What an account is *for* — independent of the institution kind. This is the
 * tag that drives the money logic:
 *   • spending — everyday money you can freely use (assets).
 *   • savings  — money deliberately set aside; its whole balance counts as
 *     "saved", and moving money in is a savings transaction.
 *   • credit   — money you owe (a liability); its balance is subtracted from
 *     net worth and the total.
 */
export type AccountRole = "spending" | "savings" | "credit";

export const ACCOUNT_ROLES: readonly AccountRole[] = [
  "spending",
  "savings",
  "credit",
];

/** Sensible default role for a given account type (used to backfill old rows). */
export function roleForType(type: AccountType): AccountRole {
  return type === "bank_savings" ? "savings" : "spending";
}

export interface AccountProps {
  id: AccountId;
  userId: UserId;
  name: string;
  type: AccountType;
  /** What the account is for. Drives the savings / liability logic. */
  role: AccountRole;
  currency: CurrencyCode;
  institution: string | null;
  /** Last digits shown in the UI, e.g. "4821". Never the full number. */
  mask: string | null;
  openingBalance: Money;
  isPrimary: boolean;
  /** Dormant accounts are hidden and excluded from net-worth totals. */
  isDormant: boolean;
}

export class Account {
  private constructor(private props: AccountProps) {}

  static create(props: AccountProps): Account {
    if (!props.name.trim()) throw new Error("Account name is required");
    return new Account({ ...props, name: props.name.trim() });
  }

  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get type() { return this.props.type; }
  get role() { return this.props.role; }
  get currency() { return this.props.currency; }

  /** Money set aside — its balance counts toward "saved". */
  get isSavings() { return this.props.role === "savings"; }
  /** Money owed — its balance is a liability, subtracted from net worth. */
  get isLiability() { return this.props.role === "credit"; }
  get institution() { return this.props.institution; }
  get mask() { return this.props.mask; }
  get openingBalance() { return this.props.openingBalance; }
  get isPrimary() { return this.props.isPrimary; }
  get isDormant() { return this.props.isDormant; }

  /**
   * Balance = opening + net movement. `netMovement` is the signed sum of this
   * account's transactions (in positive, out negative), computed by the caller
   * from the transaction repository.
   */
  balance(netMovement: Money): Money {
    return this.props.openingBalance.plus(netMovement);
  }

  /**
   * How this account moves net worth: its balance if it holds money (spending
   * or savings), or the negative of its balance if it's a liability (credit).
   */
  netWorthContribution(netMovement: Money): Money {
    const bal = this.balance(netMovement);
    return this.props.role === "credit" ? bal.negated() : bal;
  }

  /** Update the account's editable details (everything the user typed on the form). */
  edit(p: {
    name: string;
    type: AccountType;
    role: AccountRole;
    institution: string | null;
    mask: string | null;
    isPrimary: boolean;
    openingBalance: Money;
  }): void {
    if (!p.name.trim()) throw new Error("Account name is required");
    this.props.name = p.name.trim();
    this.props.type = p.type;
    this.props.role = p.role;
    this.props.institution = p.institution;
    this.props.mask = p.mask;
    this.props.isPrimary = p.isPrimary;
    this.props.openingBalance = p.openingBalance;
  }

  setPrimary(v: boolean): void { this.props.isPrimary = v; }

  markDormant(): void {
    this.props.isDormant = true;
    this.props.isPrimary = false;
  }
  reactivate(): void { this.props.isDormant = false; }

  /**
   * Reconcile the account so its current balance equals `target`. We adjust the
   * opening balance by the gap, leaving logged transactions untouched:
   *   balance = opening + netMovement  ⇒  opening = target − netMovement.
   */
  reconcileBalanceTo(target: Money, netMovement: Money): void {
    this.props.openingBalance = target.minus(netMovement);
  }

  snapshot(): Readonly<AccountProps> { return { ...this.props }; }
}
