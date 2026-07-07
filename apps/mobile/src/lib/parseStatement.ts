import { supabase } from "./supabase";

export interface ParsedRow {
  date: string | null;
  description: string;
  amountMajor: number;
  direction: "in" | "out";
  categoryHint: string | null;
}

/**
 * Sends a statement image (base64) to the `parse-statement` Edge Function and
 * returns the candidate rows. Returns null when Supabase isn't configured.
 */
export async function parseStatement(
  imageBase64: string,
  mimeType: string,
  categories: string[],
): Promise<ParsedRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("parse-statement", {
    body: { imageBase64, mimeType, categories },
  });
  if (error) throw error;
  return (data?.rows ?? []) as ParsedRow[];
}
