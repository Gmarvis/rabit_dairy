import {
  Category,
  asCategoryId,
  fail,
  ok,
  type CategoryType,
  type PaymentMethod,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type { CategoryRepository } from "../ports/repositories.js";
import type { IdGenerator } from "../ports/services.js";

export interface SaveCategoryInput {
  userId: UserId;
  /** Omit to create a new category; provide to update an existing one. */
  id?: string;
  name: string;
  type: CategoryType;
  color: string;
  defaultPaymentMethod?: PaymentMethod | null;
}

/** Command: create a new category or update an existing one. */
export class SaveCategory {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: SaveCategoryInput): Promise<Result<{ id: string }>> {
    if (!input.name.trim()) {
      return fail("name_required", "Give the category a name.");
    }

    // Preserve the archived flag on update; new categories start active.
    let isArchived = false;
    if (input.id) {
      const existing = await this.categories.findById(
        input.userId,
        asCategoryId(input.id),
      );
      if (!existing) {
        return fail("not_found", "That category no longer exists.");
      }
      isArchived = existing.isArchived;
    }

    const category = Category.create({
      id: asCategoryId(input.id ?? this.ids.next()),
      userId: input.userId,
      name: input.name,
      type: input.type,
      color: input.color,
      defaultPaymentMethod: input.defaultPaymentMethod ?? null,
      isArchived,
    });
    await this.categories.save(category);
    return ok({ id: category.id });
  }
}
