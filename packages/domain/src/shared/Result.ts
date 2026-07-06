/**
 * A tiny Result type so the domain can reject invalid operations without
 * throwing for expected, user-facing failures (validation, broken invariants).
 * Programmer errors (wrong currency, non-integer money) still throw.
 */

export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface DomainError {
  code: string;
  message: string;
}

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E = DomainError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export const fail = (code: string, message: string): Result<never> =>
  err({ code, message });
