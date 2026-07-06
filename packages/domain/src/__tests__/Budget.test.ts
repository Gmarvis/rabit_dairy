import { describe, it, expect } from "vitest";
import { compareBudget } from "../budget/Budget.js";
import { Money } from "../shared/Money.js";
import { asCategoryId } from "../shared/ids.js";

const cat = asCategoryId("groceries");

describe("compareBudget", () => {
  it("flags under budget (April groceries: 11,200 of 60,000)", () => {
    const r = compareBudget(cat, Money.fromMajor(60_000), Money.fromMajor(11_200));
    expect(r.status).toBe("under");
    expect(r.variance.major).toBe(48_800);
    expect(r.percentUsed).toBeCloseTo(0.1866, 3);
  });

  it("flags exactly at budget (Loan: 350,000 of 350,000)", () => {
    const r = compareBudget(cat, Money.fromMajor(350_000), Money.fromMajor(350_000));
    expect(r.status).toBe("at");
    expect(r.variance.isZero).toBe(true);
  });

  it("flags over budget with a negative variance", () => {
    const r = compareBudget(cat, Money.fromMajor(30_000), Money.fromMajor(40_500));
    expect(r.status).toBe("over");
    expect(r.variance.major).toBe(-10_500);
  });

  it("reports no_budget when nothing is planned and nothing spent", () => {
    const r = compareBudget(cat, null, Money.zero());
    expect(r.status).toBe("no_budget");
  });

  it("spend with no budget set counts as over", () => {
    const r = compareBudget(cat, null, Money.fromMajor(40_500));
    expect(r.status).toBe("over");
  });
});
