import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { YearMonth } from "@rabbit/domain";

interface PeriodContext {
  /** The active accounting month — defaults to the real current month. */
  period: YearMonth;
  setPeriod: (p: YearMonth) => void;
  next: () => void;
  prev: () => void;
  /** True when `period` is the current real-world month (disables "next"). */
  isCurrent: boolean;
}

const Ctx = createContext<PeriodContext | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<YearMonth>(() => YearMonth.fromDate(new Date()));

  const value = useMemo<PeriodContext>(() => {
    const current = YearMonth.fromDate(new Date());
    return {
      period,
      setPeriod,
      next: () => setPeriod((p) => p.next()),
      prev: () => setPeriod((p) => p.previous()),
      isCurrent: period.equals(current),
    };
  }, [period]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePeriod(): PeriodContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePeriod must be used within a PeriodProvider");
  return c;
}
