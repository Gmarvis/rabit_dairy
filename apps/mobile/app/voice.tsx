import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import { Card, PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { Listening } from "../src/components/Listening";
import { useContainer } from "../src/lib/auth";
import { amountFromText } from "../src/lib/word2num";
import { colors, radius, space } from "../src/theme/tokens";

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

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [group, setGroup] = useState<Group>("expense");
  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
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

  function applyTranscript(text: string) {
    const amount = amountFromText(text);
    if (amount) setDigits(String(amount));
    const lower = text.toLowerCase();
    const match = (options?.categories ?? []).find((cx) =>
      lower.includes(cx.name.toLowerCase().split(" ")[0]!),
    );
    if (match) {
      setCategoryId(match.id);
      const g = (Object.keys(GROUP_TYPES) as Group[]).find((k) => GROUP_TYPES[k].includes(match.type));
      if (g) setGroup(g);
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
        voiceTranscript: transcript || null,
        paymentMethod: accountMethod(accounts, effectiveAccountId),
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <ScreenHeader title="Speak it" onClose={() => router.back()} topInset={insets.top} />

        <View style={styles.segment}>
          {(["income", "expense", "savings"] as Group[]).map((g) => (
            <Pressable key={g} style={[styles.seg, group === g && styles.segOn]} onPress={() => { setGroup(g); setCategoryId(null); }}>
              <Text style={[styles.segText, group === g && styles.segTextOn]}>{g[0]!.toUpperCase() + g.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.amount}
            value={digits}
            onChangeText={(t) => setDigits(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((cat) => (
              <Chip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
            ))}
          </ScrollView>
        </View>

        <View>
          <Text style={styles.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={effectiveAccountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </ScrollView>
        </View>

        {/* Recording lives below the fields, per the layout you asked for. */}
        <View style={styles.recordArea}>
          {listening ? (
            <Listening size={110} playing />
          ) : (
            <Pressable style={styles.mic} onPress={toggleListen}>
              <Ionicons name="mic" size={30} color={colors.goldInk} />
            </Pressable>
          )}
          {listening ? (
            <Pressable style={styles.stop} onPress={toggleListen}>
              <Ionicons name="stop" size={13} color="#fff" />
              <Text style={styles.stopText}>Stop</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>
              {speechAvailable ? "Tap the mic and say what you spent & why" : "Voice needs the dev build — type below for now"}
            </Text>
          )}
        </View>

        <Card style={styles.transcriptCard}>
          {transcript ? (
            <Text style={styles.transcript}>&ldquo;{transcript}&rdquo;</Text>
          ) : (
            <Text style={styles.note}>Your words appear here live as you speak — the amount &amp; category above fill in automatically.</Text>
          )}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(2) }]}>
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
  return (
    <Pressable style={[styles.chip, selected && styles.chipOn]} onPress={onPress}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  recordArea: { alignItems: "center", gap: space(2), paddingVertical: space(1) },
  mic: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  stop: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.negative, borderRadius: radius.pill, paddingHorizontal: space(3.5), paddingVertical: space(2) },
  stopText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hint: { color: colors.ink2, fontSize: 12 },
  transcriptCard: { backgroundColor: "rgba(233,180,76,0.08)", borderColor: "rgba(233,180,76,0.3)", minHeight: 60, justifyContent: "center" },
  transcript: { color: colors.ink, fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  note: { color: colors.ink2, fontSize: 11, lineHeight: 16 },
  segment: { flexDirection: "row", backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: colors.gold },
  segText: { color: colors.ink2, fontSize: 12, fontWeight: "700" },
  segTextOn: { color: colors.goldInk },
  label: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  amount: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3), color: colors.ink, fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: colors.goldInk },
  dot: { width: 9, height: 9, borderRadius: 3 },
  error: { color: colors.negative, fontSize: 12 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
});
