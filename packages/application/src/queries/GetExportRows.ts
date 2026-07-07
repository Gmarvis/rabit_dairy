import {
  YearMonth,
  type Account,
  type Category,
  type UserId,
} from "@rabbit/domain";
import type {
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from "../ports/repositories.js";

/** One flat, spreadsheet-friendly row — mirrors the old Daily Log columns. */
export interface ExportRow {
  date: string;
  type: string;
  category: string;
  description: string;
  amountMajor: number;
  direction: "in" | "out";
  method: string;
  account: string;
}

/** Query: every transaction in a year as flat rows, for CSV/Excel export. */
export class GetExportRows {
  constructor(
    private readonly txns: TransactionRepository,
    private readonly categories: CategoryRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async execute(userId: UserId, year: number): Promise<ExportRow[]> {
    const [months, cats, accs] = await Promise.all([
      Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          this.txns.listByPeriod(userId, YearMonth.of(year, i + 1)),
        ),
      ),
      this.categories.listAll(userId),
      this.accounts.listAll(userId),
    ]);
    const catById = new Map<string, Category>(cats.map((c) => [c.id, c]));
    const accById = new Map<string, Account>(accs.map((a) => [a.id, a]));

    return months
      .flat()
      .sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1))
      .map((t) => ({
        date: t.occurredAt.slice(0, 10),
        type: t.categoryType,
        category: catById.get(t.categoryId)?.name ?? "—",
        description: t.description ?? "",
        amountMajor: t.amount.major,
        direction: t.direction,
        method: t.paymentMethod ?? "",
        account: accById.get(t.accountId)?.name ?? "—",
      }));
  }
}
