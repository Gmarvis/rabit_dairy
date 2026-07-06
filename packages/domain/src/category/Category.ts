import type { CategoryId, UserId } from "../shared/ids.js";

/**
 * The five category types from the Rabbit Dairy spreadsheet. They drive both
 * reporting groups and the default cash direction of a transaction.
 */
export type CategoryType =
  | "income"
  | "fixed_expense"
  | "variable_expense"
  | "savings"
  | "business_cost";

export const CATEGORY_TYPES: readonly CategoryType[] = [
  "income",
  "fixed_expense",
  "variable_expense",
  "savings",
  "business_cost",
];

/** Is money normally coming *in* for this type (income), or going *out*? */
export function defaultDirection(type: CategoryType): "in" | "out" {
  return type === "income" ? "in" : "out";
}

export type PaymentMethod =
  | "cash"
  | "mobile_money"
  | "bank_card"
  | "bank_transfer"
  | "other";

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "cash",
  "mobile_money",
  "bank_card",
  "bank_transfer",
  "other",
];

export interface CategoryProps {
  id: CategoryId;
  userId: UserId;
  name: string;
  type: CategoryType;
  /** Hex colour used consistently across every chart. */
  color: string;
  defaultPaymentMethod: PaymentMethod | null;
  isArchived: boolean;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(props: CategoryProps): Category {
    if (!props.name.trim()) throw new Error("Category name is required");
    return new Category({ ...props, name: props.name.trim() });
  }

  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get type() { return this.props.type; }
  get color() { return this.props.color; }
  get defaultPaymentMethod() { return this.props.defaultPaymentMethod; }
  get isArchived() { return this.props.isArchived; }
  get isExpense() {
    return (
      this.props.type === "fixed_expense" ||
      this.props.type === "variable_expense" ||
      this.props.type === "business_cost"
    );
  }

  rename(name: string): void {
    if (!name.trim()) throw new Error("Category name is required");
    this.props.name = name.trim();
  }

  archive(): void { this.props.isArchived = true; }
  restore(): void { this.props.isArchived = false; }

  snapshot(): Readonly<CategoryProps> { return { ...this.props }; }
}
