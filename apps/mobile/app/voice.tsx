import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import type { EntryCategoryOption } from "@rabbit/application";
import { AmountHero, AmountKeypad, Card, ChipRow, PrimaryButton, Row, Segment, SelectChip } from "../src/components/ui";
import { useReducedMotion } from "../src/components/anim";
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

// Speech recognition is a NATIVE module — load defensively so the screen never
// crashes the route tree when it's absent (Expo Go / a stale binary).
const Speech = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition");
  } catch {
    return null;
  }
})() as typeof import("expo-speech-recognition") | null;

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
  const [seconds, setSeconds] = useState(0);
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

  // Recording timer.
  useEffect(() => {
    if (!listening) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);
  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

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

  async function applyTranscript(text: string) {
    if (!text.trim()) return;
    const allCats = options?.categories ?? [];
    const quick = amountFromText(text);
    if (quick) setDigits(String(quick));
    try {
      setParsing(true);
      const parsed = await parseVoice(text, allCats.map((cx) => cx.name));
      if (!parsed) return;
      if (parsed.amountMajor && parsed.amountMajor > 0) setDigits(String(parsed.amountMajor));
      if (parsed.note) setNote(parsed.note);
      const cat = matchCategory(parsed.categoryHint, allCats);
      if (cat) { setCategoryId(cat.id); setGroup(groupOf(cat.type)); }
    } catch {
      setError("Couldn't read that automatically — check the amount & category below.");
    } finally {
      setParsing(false);
    }
  }

  async function toggleListen() {
    setError(null);
    if (!Speech) {
      setError("Voice needs the dev build — rebuild with 'npx expo run:ios'.");
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

  function press(key: string) {
    setError(null);
    if (key === "del") { setDigits((d) => d.slice(0, -1)); return; }
    setDigits((d) => {
      if (d === "" || d === "0") return key === "000" ? d : key;
      const next = d + key;
      return next.length <= 12 ? next : d;
    });
  }

  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!categoryId && !!effectiveAccountId;
  const reviewing = !listening && transcript.trim().length > 0;

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
      {/* Header: Cancel + live timer */}
      <Row between style={[s.header, { paddingTop: Math.min(insets.top, space(2)) + space(2) }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        {listening ? (
          <Row style={{ gap: 6 }}>
            <View style={s.recDot} />
            <Text style={s.timer}>{timer}</Text>
          </Row>
        ) : null}
      </Row>

      {reviewing ? (
        /* ---------- Review the parsed transaction ---------- */
        <>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(3), gap: space(3) }}>
            <HeardCard s={s} transcript={transcript} parsing={parsing} maxHeight={116} />

            <Segment<Group>
              options={[
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
                { value: "savings", label: "Savings" },
              ]}
              value={group}
              onChange={(g) => { setGroup(g); setCategoryId(null); }}
            />

            <View style={{ paddingVertical: space(1) }}>
              <AmountHero value={amountMajor} size={44} caret />
            </View>

            <ChipRow label="Category">
              {categories.map((cat) => (
                <SelectChip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
              ))}
            </ChipRow>

            <ChipRow label="Account">
              {accounts.map((a) => (
                <SelectChip key={a.id} label={a.name} selected={effectiveAccountId === a.id} onPress={() => setAccountId(a.id)} />
              ))}
            </ChipRow>

            {error ? <Text style={s.error}>{error}</Text> : null}
          </ScrollView>

          {/* Editable amount — a failed parse is never a dead end. */}
          <View style={{ paddingHorizontal: space(4), paddingTop: space(2) }}>
            <AmountKeypad onKey={press} />
          </View>
        </>
      ) : (
        /* ---------- Recording ---------- */
        <View style={s.recordBody}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space(5) }}>
            {listening ? (
              <>
                <Text style={s.listening}>LISTENING…</Text>
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  <View style={s.waveGlow} />
                  <Listening size={150} playing />
                </View>
              </>
            ) : (
              <>
                <View style={s.micHint}>
                  <Ionicons name="mic-outline" size={30} color={pal.gold} />
                </View>
                <Text style={s.prompt}>Tap the mic and say{"\n"}what you spent &amp; why</Text>
              </>
            )}
          </View>

          {transcript ? <HeardCard s={s} transcript={transcript} maxHeight={220} /> : null}

          {error ? <Text style={[s.error, { textAlign: "center" }]}>{error}</Text> : null}
        </View>
      )}

      {/* Footer action */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
        {reviewing ? (
          <>
            <PrimaryButton label="Save transaction" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
            <Pressable onPress={toggleListen} hitSlop={8} style={{ alignItems: "center", paddingVertical: space(2) }}>
              <Text style={s.again}>Record again</Text>
            </Pressable>
          </>
        ) : (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            {listening ? <PulseRing color={pal.negative} /> : null}
            <Pressable
              onPress={toggleListen}
              style={[s.recordBtn, { backgroundColor: listening ? pal.negative : pal.gold, shadowColor: listening ? pal.negative : pal.gold }]}
              accessibilityLabel={listening ? "Stop recording" : "Start recording"}
            >
              {listening ? <View style={s.stopSquare} /> : <Ionicons name="mic" size={30} color={pal.goldInk} />}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function accountMethod(accounts: { id: string; type: AccountType }[], id: string | null): PaymentMethod {
  const a = accounts.find((x) => x.id === id);
  return a ? methodForAccount(a.type) : "cash";
}

/**
 * The transcript readout. Height-capped with an inner scroll that follows the
 * latest words, so a long recording never buries the controls below it.
 */
function HeardCard({ s, transcript, parsing, maxHeight }: { s: ReturnType<typeof makeStyles>; transcript: string; parsing?: boolean; maxHeight: number }) {
  const scroll = useRef<ScrollView>(null);
  return (
    <Card style={s.heardCard}>
      <Text style={s.heardLabel}>Heard so far</Text>
      <ScrollView
        ref={scroll}
        style={{ maxHeight, marginTop: space(2) }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        <Text style={s.heardText}>&ldquo;{transcript}&rdquo;</Text>
      </ScrollView>
      {parsing ? <Text style={s.reading}>Reading the amount &amp; category…</Text> : null}
    </Card>
  );
}

/** An expanding, fading ring behind the record button while recording. */
function PulseRing({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, reduced]);
  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: 72, height: 72, borderRadius: 36, backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
      }}
    />
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { paddingHorizontal: space(4), paddingBottom: space(2) },
  cancel: { color: c.gold, fontSize: 15, fontWeight: "600" },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.negative },
  timer: { color: c.negative, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
  recordBody: { flex: 1, paddingHorizontal: space(4) },
  listening: { color: c.ink2, fontSize: 13, fontWeight: "700", letterSpacing: 3 },
  waveGlow: { position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: c.goldSoft },
  micHint: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  prompt: { color: c.ink2, fontSize: 15, textAlign: "center", lineHeight: 22 },
  recordBtn: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  stopSquare: { width: 24, height: 24, borderRadius: 6, backgroundColor: "#fff" },
  again: { color: c.ink2, fontSize: 13, fontWeight: "600" },
  heardCard: { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  heardLabel: { color: c.gold, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  heardText: { color: c.ink, fontSize: 14, lineHeight: 21 },
  reading: { color: c.gold, fontSize: 11, fontWeight: "700", marginTop: space(2) },
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: c.gold, shadowColor: c.gold, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  segText: { color: c.ink2, fontSize: 13, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  error: { color: c.negative, fontSize: 13, fontWeight: "600" },
  footer: { paddingHorizontal: space(4), paddingTop: space(2) },
});
