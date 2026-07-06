/**
 * Branded id types. They are strings at runtime but distinct at compile time,
 * so an AccountId can never be passed where a CategoryId is expected.
 */

declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type UserId = Brand<string, "UserId">;
export type AccountId = Brand<string, "AccountId">;
export type CategoryId = Brand<string, "CategoryId">;
export type TransactionId = Brand<string, "TransactionId">;
export type BudgetId = Brand<string, "BudgetId">;
export type TransferId = Brand<string, "TransferId">;

export const asUserId = (s: string) => s as UserId;
export const asAccountId = (s: string) => s as AccountId;
export const asCategoryId = (s: string) => s as CategoryId;
export const asTransactionId = (s: string) => s as TransactionId;
export const asBudgetId = (s: string) => s as BudgetId;
export const asTransferId = (s: string) => s as TransferId;
