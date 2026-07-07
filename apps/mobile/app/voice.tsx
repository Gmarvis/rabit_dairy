import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import type { EntryCategoryOption } from "@rabbit/application";
import { Card, PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { Listening } from "../src/components/Listening";
import { useContainer } from "../src/lib/auth";
import { amountFromText } from "../src/lib/word2num";
import { parseVoice } from "../src/lib/parseVoice";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

type Group = "income" | "expense" | "savings";
const GROUP_TYPES: Record<Group, CategoryType[]> = {
  income: ["income"],
  expense: ["fixed_expense", "variable_expense", "business_cost"],
  savings: ["savings"],
};
function methodForAccount(type: AccountType): PaymentMethod {
  if (type === "mobile_money") return "mobile_money";
  if (type === "cash") return "cash";
  return "bank_transfer";
}
function groupOf(type: CategoryType): Group {
  return (Object.keys(GROUP_TYPES) as Group[]).find((g) => GROUP_TYPES[g].includes(type))!;
}
/** Resolve an LLM/word category hint to one of the user's real categories. */
function matchCategory(hint: string | null, cats: EntryCategoryOption[]): EntryCategoryOption | null {
  if (!hint) return null;
  const h = hint.toLowerCase().trim();
  return (
    cats.find((c) => c.name.toLowerCase() === h) ??
    cats.find((c) => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase())) ??
    cats.find((c) => h.includes(c.name.toLowerCase().split(" ")[0]!)) ??
    null
  );
}

// Speech recognition is a NATIVE module — present only in a dev build, absent in
// Expo Go / a stale binary. Load it defensively so the screen never crashes the
// route tree; if it's missing we fall back to typing the fields manually.
const Speech = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition");
  } catch {
    return null;
  }
})() as typeof import("expo-speech-recognition") | null;

const speechAvailable = !!Speech;
const useSpeechRecognitionEvent = (Speech?.useSpeechRecognitionEvent ??
  (() => {})) as (name: string, cb: (e: any) => void) => void;

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const pal = useTheme();
  const s = makeStyles(pal);

  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [group, setGroup] = useState<Group>("expense");
  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["entry-options"],
    queryFn: () => c.queries.entryOptions.execute(c.userId),
  });
  const accounts = options?.accounts ?? [];
  const effectiveAccountId =
    accountId ?? accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? null;
  const categories = useMemo(
    () => (options?.categories ?? []).filter((cat) => GROUP_TYPES[group].includes(cat.type)),
    [options, group],
  );

  useSpeechRecognitionEvent("result", (e) => {
    const t = e.results[0]?.transcript ?? "";
    setTranscript(t);
    if (e.isFinal) applyTranscript(t);
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", (e) => {
    setListening(false);
    setError(e.message || "Speech recognition failed.");
  });

  /** Instant on-device guess, then an LLM refine (amount + category + note). */
  async function applyTranscript(text: string) {
    if (!text.trim()) return;
    const allCats = options?.categories ?? [];

    // 1. On-device: fill the amount straight away so the UI reacts instantly.
    const quick = amountFromText(text);
    if (quick) setDigits(String(quick));

    // 2. LLM refine via the deployed `transcribe` function (text mode). Demo
    //    mode returns null → we keep the on-device guess.
    try {
      setParsing(true);
      const parsed = await parseVoice(text, allCats.map((cx) => cx.name));
      if (!parsed) return;
      if (parsed.amountMajor && parsed.amountMajor > 0) setDigits(String(parsed.amountMajor));
      if (parsed.note) setNote(parsed.note);
      const cat = matchCategory(parsed.categoryHint, allCats);
      if (cat) {
        setCategoryId(cat.id);
        setGroup(groupOf(cat.type));
      }
    } catch {
      setError("Couldn't read that automatically — check the amount & category below.");
    } finally {
      setParsing(false);
    }
  }

  async function toggleListen() {
    setError(null);
    if (!Speech) {
      setError("Voice needs the dev build — rebuild with 'npx expo run:ios'. You can still type below.");
      return;
    }
    if (listening) {
      Speech.ExpoSpeechRecognitionModule.stop();
      return;
    }
    const perm = await Speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return setError("Microphone & speech permission are needed.");
    setTranscript("");
    setListening(true);
    Speech.ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: true });
  }

  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!categoryId && !!effectiveAccountId;

  const save = useMutation({
    mutationFn: async () => {
      const res = await c.commands.logTransaction.execute({
        userId: c.userId,
        accountId: effectiveAccountId as never,
        categoryId: categoryId as never,
        amountMajor,
        source: "voice",
        description: note ?? transcript ?? null,
        voiceTranscript: transcript || null,
        paymentMethod: accountMethod(accounts, effectiveAccountId),
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <ScreenHeader title="Speak it" onClose={() => router.back()} topInset={insets.top} />

        <View style={s.segment}>
          {(["income", "expense", "savings"] as Group[]).map((g) => (
            <Pressable key={g} style={[s.seg, group === g && s.segOn]} onPress={() => { setGroup(g); setCategoryId(null); }}>
              <Text style={[s.segText, group === g && s.segTextOn]}>{g[0]!.toUpperCase() + g.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View>
          <Text style={s.label}>Amount</Text>
          <TextInput
            style={s.amount}
            value={digits}
            onChangeText={(t) => setDigits(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={pal.muted}
          />
        </View>

        <View>
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {categories.map((cat) => (
              <Chip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={s.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={effectiveAccountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </ScrollView>
        </View>

        {/* Recording lives below the fields, per the layout you asked for. */}
        <View style={s.recordArea}>
          {listening ? (
            <Listening size={110} playing />
          ) : (
            <Pressable style={s.mic} onPress={toggleListen}>
              <Ionicons name="mic" size={30} color={pal.goldInk} />
            </Pressable>
          )}
          {listening ? (
            <Pressable style={s.stop} onPress={toggleListen}>
              <Ionicons name="stop" size={13} color="#fff" />
              <Text style={s.stopText}>Stop</Text>
            </Pressable>
          ) : (
            <Text style={s.hint}>
              {speechAvailable ? "Tap the mic and say what you spent & why" : "Voice needs the dev build — type below for now"}
            </Text>
          )}
        </View>

        <Card style={s.transcriptCard}>
          {transcript ? (
            <Text style={s.transcript}>&ldquo;{transcript}&rdquo;</Text>
          ) : (
            <Text style={s.note}>Your words appear here live as you speak — the amount &amp; category above fill in automatically.</Text>
          )}
          {parsing ? <Text style={s.reading}>Reading the amount &amp; category…</Text> : null}
        </Card>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <PrimaryButton label="Save transaction" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
      </View>
    </View>
  );
}

function accountMethod(accounts: { id: string; type: AccountType }[], id: string | null): PaymentMethod {
  const a = accounts.find((x) => x.id === id);
  return a ? methodForAccount(a.type) : "cash";
}

function Chip({ label, color, selected, onPress }: { label: string; color?: string; selected: boolean; onPress: () => void }) {
  const c = useTheme();
  const s = makeStyles(c);
  return (
    <Pressable style={[s.chip, selected && s.chipOn]} onPress={onPress}>
      {color ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  recordArea: { alignItems: "center", gap: space(2), paddingVertical: space(1) },
  mic: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.gold, alignItems: "center", justifyContent: "center" },
  stop: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.negative, borderRadius: radius.pill, paddingHorizontal: space(3.5), paddingVertical: space(2) },
  stopText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hint: { color: c.ink2, fontSize: 12 },
  transcriptCard: { backgroundColor: c.goldSoft, borderColor: c.goldBorder, minHeight: 60, justifyContent: "center" },
  transcript: { color: c.ink, fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  note: { color: c.ink2, fontSize: 11, lineHeight: 16 },
  reading: { color: c.gold, fontSize: 11, fontWeight: "700", marginTop: space(2) },
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 12, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  label: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  amount: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3), color: c.ink, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
  dot: { width: 9, height: 9, borderRadius: 3 },
  error: { color: c.negative, fontSize: 12 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
});
