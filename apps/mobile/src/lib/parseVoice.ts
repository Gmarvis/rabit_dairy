import { supabase } from "./supabase";

export interface ParsedVoice {
  transcript: string;
  amountMajor: number | null;
  categoryHint: string | null;
  method: "cash" | "mobile_money" | "bank_card" | "bank_transfer" | null;
  note: string | null;
}

/**
 * Sends an already-captured (on-device) transcript to the `transcribe` Edge
 * Function's text mode and returns the parsed draft transaction. Returns null
 * when Supabase isn't configured (demo mode) so callers can fall back to the
 * on-device word parser.
 */
export async function parseVoice(
  text: string,
  categories: string[],
): Promise<ParsedVoice | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("transcribe", {
    body: { text, categories },
  });
  if (error) throw error;
  return data as ParsedVoice;
}
