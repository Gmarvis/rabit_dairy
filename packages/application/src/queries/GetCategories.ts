import {
  CATEGORY_TYPES,
  type CategoryType,
  type PaymentMethod,
  type UserId,
} from "@rabbit/domain";
import type { CategoryRepository } from "../ports/repositories.js";
import type { CategoriesView, CategoryGroup } from "./viewmodels.js";

const TYPE_LABEL: Record<CategoryType, string> = {
  income: "Income",
  fixed_expense: "Fixed expense",
  variable_expense: "Variable expense",
  savings: "Savings",
  business_cost: "Business cost",
};

/** Query: every category the user has, grouped by type for the Categories screen. */
export class GetCategories {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(userId: UserId): Promise<CategoriesView> {
    const cats = (await this.categories.listAll(userId)).filter(
      (c) => !c.isArchived,
    );

    const groups: CategoryGroup[] = CATEGORY_TYPES.map((type) => ({
      type,
      label: TYPE_LABEL[type],
      items: cats
        .filter((c) => c.type === type)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          color: c.color,
          defaultPaymentMethod: c.defaultPaymentMethod as PaymentMethod | null,
        })),
    })).filter((g) => g.items.length > 0);

    return {
      groups,
      total: cats.length,
      typeCount: groups.length,
    };
  }
}
