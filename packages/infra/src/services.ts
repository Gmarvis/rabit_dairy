import type { Clock, FileStorage, IdGenerator } from "@rabbit/application";
import type { SupabaseClient } from "@supabase/supabase-js";

/** UUIDs from the platform crypto (available in Hermes/RN and Node ≥ 16). */
export class UuidIds implements IdGenerator {
  next() {
    return crypto.randomUUID();
  }
}

export class SystemClock implements Clock {
  nowIso() {
    return new Date().toISOString();
  }
}

/**
 * Uploads to a private Supabase Storage bucket under `<uid>/…` so the RLS
 * storage policies (see 0002_rls.sql) allow it.
 */
export class SupabaseFileStorage implements FileStorage {
  constructor(
    private db: SupabaseClient,
    private userId: string,
    private ids: IdGenerator,
  ) {}

  async upload(
    bucket: "voice-notes" | "receipts",
    localUri: string,
    contentType: string,
  ): Promise<{ path: string }> {
    const ext = contentType.split("/")[1] ?? "bin";
    const path = `${this.userId}/${this.ids.next()}.${ext}`;
    const blob = await (await fetch(localUri)).blob();
    const { error } = await this.db.storage
      .from(bucket)
      .upload(path, blob, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  }
}
