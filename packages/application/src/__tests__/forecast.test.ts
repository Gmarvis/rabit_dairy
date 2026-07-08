import { describe, it, expect } from "vitest";
import { YearMonth, asAccountId, asCategoryId } from "@rabbit/domain";
import { LogTransaction } from "../commands/LogTransaction.js";
import { GetForecast } from "../queries/GetForecast.js";
import {
  FixedClock,
  InMemoryCategories,
  InMemoryTransactions,
  SeqIds,
  USER,
  groceriesCategory,
  salaryCategory,
} from "./fakes.js";

const ACC = asAccountId("acc-salary");
const SALARY = asCategoryId("cat-salary");
const GROCERIES = asCategoryId("cat-groceries");
const APRIL = YearMonth.of(2026, 4);

describe("GetForecast", () => {
  it("projects month-end spend at the current pace and shows what trimming would save", async () => {
    const txns = new InMemoryTransactions();
    const categories = new InMemoryCategories().seed(salaryCategory()).seed(groceriesCategory());
    // Mid-April: 15 of 30 days elapsed.
    const clock = new FixedClock("2026-04-15T12:00:00.000Z");
    const log = new LogTransaction(txns, categories, new SeqIds(), clock);

    await log.execute({ userId: USER, accountId: ACC, categoryId: SALARY, amountMajor: 100_000, occurredAt: "2026-04-01T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 30_000, occurredAt: "2026-04-10T00:00:00Z" });
    await log.execute({ userId: USER, accountId: ACC, categoryId: GROCERIES, amountMajor: 40_000, occurredAt: "2026-03-10T00:00:00Z" });

    const view = await new GetForecast(txns, clock).execute(USER, APRIL);

    expect(view.daysElapsed).toBe(15);
    expect(view.daysInMonth).toBe(30);
    expect(view.daysLeft).toBe(15);
    expect(view.dailyPace.minor).toBe(2_000); // 30k / 15 days
    expect(view.projectedSpend.minor).toBe(60_000); // 2k * 30
    expect(view.projectedNet.minor).toBe(40_000); // 100k − 60k
    expect(view.onTrackToSave.minor).toBe(40_000);
    expect(view.suggestedDailyCap.minor).toBe(1_700); // 15% less
    expect(view.saveIfCapped.minor).toBe(4_500); // 300/day * 15 days left
    expect(view.paceVsLastMonth).toBeCloseTo(0.5); // 60k vs 40k last month
  });
});
