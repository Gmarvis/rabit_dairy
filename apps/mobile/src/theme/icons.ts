/**
 * Maps domain concepts to Ionicons glyph names, so the UI uses real icons
 * everywhere instead of emoji. Category icons resolve by name keyword first
 * (stable across the seeded spreadsheet categories), then fall back by type.
 */
import type { Ionicons } from "@expo/vector-icons";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";

type Glyph = keyof typeof Ionicons.glyphMap;

const NAME_ICONS: ReadonlyArray<[RegExp, Glyph]> = [
  [/salary|wage|pay(check|roll)/i, "cash"],
  [/freelanc|consult|invoice/i, "briefcase"],
  [/invest|dividend|interest/i, "trending-up"],
  [/rent|mortgage|housing/i, "home"],
  [/loan|debt|njangi|repay/i, "swap-horizontal"],
  [/internet|phone|airtime|data|wifi/i, "wifi"],
  [/grocer|food|market|restaurant|eat/i, "restaurant"],
  [/shop|cloth|wear/i, "bag-handle"],
  [/gift|donation|charity/i, "gift"],
  [/tithe|church|offering/i, "heart"],
  [/transport|fuel|taxi|bus|car/i, "car"],
  [/save|saving|emergency|fund/i, "shield-checkmark"],
  [/equip|hardware|tool|device/i, "construct"],
  [/software|subscription|app/i, "laptop"],
  [/health|medic|hospital|drug/i, "medkit"],
  [/school|fee|tuition|educat/i, "school"],
];

const TYPE_ICONS: Record<CategoryType, Glyph> = {
  income: "arrow-down-circle",
  fixed_expense: "repeat",
  variable_expense: "pricetag",
  savings: "shield-checkmark",
  business_cost: "briefcase",
};

/** Best icon for a category, by its name then its type. */
export function iconForCategory(name: string, type: CategoryType): Glyph {
  for (const [re, glyph] of NAME_ICONS) if (re.test(name)) return glyph;
  return TYPE_ICONS[type];
}

const ACCOUNT_ICONS: Record<AccountType, Glyph> = {
  bank_salary: "business",
  bank_savings: "shield-checkmark",
  bank_other: "moon",
  mobile_money: "phone-portrait",
  cash: "wallet",
};

export function iconForAccount(type: AccountType): Glyph {
  return ACCOUNT_ICONS[type] ?? "card";
}

const METHOD_ICONS: Record<PaymentMethod, Glyph> = {
  cash: "cash",
  mobile_money: "phone-portrait",
  bank_transfer: "swap-horizontal",
  bank_card: "card",
  other: "ellipsis-horizontal-circle",
};

export function iconForMethod(method: PaymentMethod): Glyph {
  return METHOD_ICONS[method] ?? "card";
}
