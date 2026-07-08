import { describe, it, expect } from "vitest";
import { SaveCategory } from "../commands/SaveCategory.js";
import { ArchiveCategory } from "../commands/ArchiveCategory.js";
import { GetCategories } from "../queries/GetCategories.js";
import {
  InMemoryCategories,
  SeqIds,
  USER,
  groceriesCategory,
  salaryCategory,
} from "./fakes.js";

describe("GetCategories", () => {
  it("groups active categories by type, in type order, with counts", async () => {
    const categories = new InMemoryCategories()
      .seed(salaryCategory())
      .seed(groceriesCategory());

    const view = await new GetCategories(categories).execute(USER);

    expect(view.total).toBe(2);
    expect(view.typeCount).toBe(2);
    // income precedes variable_expense in CATEGORY_TYPES order.
    expect(view.groups.map((g) => g.type)).toEqual(["income", "variable_expense"]);
    expect(view.groups[0]!.label).toBe("Income");
    expect(view.groups[0]!.items[0]!.name).toBe("Salary (Net)");
  });
});

describe("SaveCategory", () => {
  it("creates a new category, then updates it by id while preserving archived state", async () => {
    const categories = new InMemoryCategories();
    const cmd = new SaveCategory(categories, new SeqIds());

    const created = await cmd.execute({
      userId: USER,
      name: "Transport / Fuel",
      type: "variable_expense",
      color: "#E06A5A",
      defaultPaymentMethod: "cash",
    });
    expect(created.ok).toBe(true);
    const id = created.ok ? created.value.id : "";

    // Archive it, then edit — the archived flag must survive the update.
    await new ArchiveCategory(categories).execute({ userId: USER, id, archived: true });
    const updated = await cmd.execute({
      userId: USER,
      id,
      name: "Transport",
      type: "fixed_expense",
      color: "#4E8FD9",
    });
    expect(updated.ok).toBe(true);

    const stored = await categories.findById(USER, id as never);
    expect(stored?.name).toBe("Transport");
    expect(stored?.type).toBe("fixed_expense");
    expect(stored?.isArchived).toBe(true);

    // Archived categories drop out of the grouped view.
    const view = await new GetCategories(categories).execute(USER);
    expect(view.total).toBe(0);
  });

  it("rejects a blank name", async () => {
    const cmd = new SaveCategory(new InMemoryCategories(), new SeqIds());
    const res = await cmd.execute({ userId: USER, name: "  ", type: "income", color: "#000" });
    expect(res.ok).toBe(false);
  });
});
