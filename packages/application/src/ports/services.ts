import type { TransactionSource } from "@rabbit/domain";

/** Generates domain ids (UUIDs in infra, deterministic in tests). */
export interface IdGenerator {
  next(): string;
}

/** The current time — injected so command handlers stay deterministic. */
export interface Clock {
  nowIso(): string;
}

/** Uploads a local file (voice note / receipt) and returns its storage path. */
export interface FileStorage {
  upload(
    bucket: "voice-notes" | "receipts",
    localUri: string,
    contentType: string,
  ): Promise<{ path: string }>;
}

/** A single row parsed from a voice recording or a scanned statement. */
export interface ParsedEntry {
  amountMajor: number;
  direction: "in" | "out";
  description: string | null;
  occurredAt: string;
  /** Best-guess category name; the user confirms/edits before import. */
  suggestedCategory: string | null;
  paymentMethodHint: string | null;
  source: TransactionSource;
}

/** Speech-to-text + parse of a spoken transaction ("spent 40,500 on clothes…"). */
export interface VoiceParser {
  transcribe(localAudioUri: string): Promise<string>;
  parse(transcript: string): Promise<ParsedEntry>;
}

/** OCR + parse of a bank / mobile-money statement image into candidate rows. */
export interface StatementParser {
  parse(localImageUri: string): Promise<ParsedEntry[]>;
}
