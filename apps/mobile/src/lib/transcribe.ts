import { supabase } from "./supabase";

export interface VoiceDraft {
  transcript: string;
  amountMajor: number | null;
  categoryHint: string | null;
  method: string | null;
  note: string | null;
}

/**
 * Calls the `transcribe` Edge Function with the uploaded audio path. Returns a
 * draft transaction parsed from the spoken note, or null when Supabase isn't
 * configured (demo mode). Throws on a function error so the caller can fall back.
 */
export async function transcribeNote(
  path: string,
  categories: string[],
): Promise<VoiceDraft | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("transcribe", {
    body: { path, categories },
  });
  if (error) throw error;
  return data as VoiceDraft;
}
