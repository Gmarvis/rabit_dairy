import {
  asCategoryId,
  fail,
  ok,
  type Result,
  type UserId,
} from "@rabbit/domain";
import type { CategoryRepository } from "../ports/repositories.js";

export interface ArchiveCategoryInput {
  userId: UserId;
  id: string;
  archived: boolean;
}

/**
 * Command: hide a category from pickers (or bring it back). We archive rather
 * than delete so historical transactions keep their category.
 */
export class ArchiveCategory {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(input: ArchiveCategoryInput): Promise<Result<{ id: string }>> {
    const category = await this.categories.findById(
      input.userId,
      asCategoryId(input.id),
    );
    if (!category) {
      return fail("not_found", "That category no longer exists.");
    }
    if (input.archived) category.archive();
    else category.restore();
    await this.categories.save(category);
    return ok({ id: category.id });
  }
}
