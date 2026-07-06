import { describe, it, expect } from "vitest";
import { summarise } from "../reporting/PeriodSummary.js";
import { april2026, march2026 } from "./fixtures.js";

describe("PeriodSummary — April 2026 (matches the spreadsheet)", () => {
  const s = summarise(april2026());

  it("totals income, expenses and savings", () => {
    expect(s.income.major).toBe(811_821);
    expect(s.expenses.major).toBe(564_200);
    expect(s.savings.major).toBe(0);
  });

  it("net balance = income − expenses − savings", () => {
    expect(s.netBalance.major).toBe(247_621);
  });

  it("expense rate matches the sheet (~69.5%)", () => {
    expect(s.expenseRate).toBeCloseTo(0.694980, 5);
  });

  it("counts the transactions", () => {
    expect(s.transactionCount).toBe(6);
  });
});

describe("PeriodSummary — March 2026", () => {
  it("savings rate = savings / income (~45.5%)", () => {
    const s = summarise(march2026());
    expect(s.savings.major).toBe(400_000);
    expect(s.income.major).toBe(880_000);
    expect(s.savingsRate).toBeCloseTo(0.454545, 5);
  });
});
