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

export interface AccountProps {
  id: AccountId;
  userId: UserId;
  name: string;
  type: AccountType;
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
  get currency() { return this.props.currency; }
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

  markDormant(): void {
    this.props.isDormant = true;
    this.props.isPrimary = false;
  }
  reactivate(): void { this.props.isDormant = false; }

  snapshot(): Readonly<AccountProps> { return { ...this.props }; }
}
