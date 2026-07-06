import { describe, it, expect } from "vitest";
import { Money } from "../shared/Money.js";

describe("Money", () => {
  it("XAF has no minor units — major equals minor", () => {
    const m = Money.fromMajor(811_821, "XAF");
    expect(m.minor).toBe(811_821);
    expect(m.major).toBe(811_821);
  });

  it("formats with the FCFA suffix", () => {
    expect(Money.fromMajor(247_621).format()).toBe("247,621 FCFA");
    expect(Money.fromMajor(247_621).format({ withCode: false })).toBe("247,621");
  });

  it("adds and subtracts without drift", () => {
    const sum = Money.fromMajor(40_500)
      .plus(Money.fromMajor(150_000))
      .plus(Money.fromMajor(350_000))
      .plus(Money.fromMajor(11_200))
      .plus(Money.fromMajor(12_500));
    expect(sum.major).toBe(564_200);
  });

  it("ratioOf returns 0 against a zero base", () => {
    expect(Money.fromMajor(100).ratioOf(Money.zero())).toBe(0);
  });

  it("rejects a currency mismatch", () => {
    expect(() => Money.fromMajor(1, "XAF").plus(Money.fromMajor(1, "USD"))).toThrow();
  });

  it("USD keeps 2 decimals", () => {
    const m = Money.fromMajor(12.5, "USD");
    expect(m.minor).toBe(1250);
    expect(m.format()).toBe("12.50 USD");
  });
});
