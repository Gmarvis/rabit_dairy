import { supabase } from "./supabase";

export interface ParsedRow {
  date: string | null;
  description: string;
  amountMajor: number;
  direction: "in" | "out";
  categoryHint: string | null;
}

export interface ParsedBalance {
  label: string | null;
  amountMajor: number;
}

export interface ParsedDocument {
  kind: "transactions" | "balance";
  rows: ParsedRow[];
  balances: ParsedBalance[];
}

/**
 * Sends an image (base64) to the `parse-statement` Edge Function, which reads
 * whatever it holds — a receipt, a statement, or an account-balance screen —
 * and returns the classified result. Returns null when Supabase isn't
 * configured.
 */
export async function parseDocument(
  imageBase64: string,
  mimeType: string,
  categories: string[],
): Promise<ParsedDocument | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("parse-statement", {
    body: { imageBase64, mimeType, categories },
  });
  if (error) throw error;
  return {
    kind: data?.kind === "balance" ? "balance" : "transactions",
    rows: (data?.rows ?? []) as ParsedRow[],
    balances: (data?.balances ?? []) as ParsedBalance[],
  };
}
