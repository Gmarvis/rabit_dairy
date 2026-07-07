import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import { Card, Row } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { transcribeNote } from "../src/lib/transcribe";
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
function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [uri, setUri] = useState<string | null>(null);
  const [voicePath, setVoicePath] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const player = useAudioPlayer(uri ? { uri } : undefined);

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

  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!categoryId && !!effectiveAccountId;

  async function toggleRecord() {
    setError(null);
    try {
      if (recState.isRecording) {
        await recorder.stop();
        const recorded = recorder.uri ?? null;
        setUri(recorded);
        if (recorded) void handleRecorded(recorded);
        return;
      }
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission is needed to record.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setUri(null);
    } catch {
      setError("Couldn't start recording on this device.");
    }
  }

  // After a take: upload it, then (when live) transcribe and pre-fill the fields.
  async function handleRecorded(localUri: string) {
    let path = localUri;
    try {
      path = (await c.storage.upload("voice-notes", localUri, "audio/m4a")).path;
    } catch {
      /* keep the local uri if upload fails */
    }
    setVoicePath(path);
    if (c.isDemo) return;
    try {
      setTranscribing(true);
      const draft = await transcribeNote(path, categories.map((cat) => cat.name));
      if (draft) {
        setTranscript(draft.transcript || null);
        if (draft.amountMajor) setDigits(String(draft.amountMajor));
        if (draft.categoryHint) {
          const hint = draft.categoryHint.toLowerCase();
          const match = (options?.categories ?? []).find(
            (cx) => cx.name.toLowerCase().includes(hint) || hint.includes(cx.name.toLowerCase()),
          );
          if (match) setCategoryId(match.id);
        }
      }
    } catch {
      setError("Couldn't transcribe — fill the details in below.");
    } finally {
      setTranscribing(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      let path = voicePath;
      if (!path && uri) {
        try {
          path = (await c.storage.upload("voice-notes", uri, "audio/m4a")).path;
        } catch {
          path = uri;
        }
      }
      const res = await c.commands.logTransaction.execute({
        userId: c.userId,
        accountId: effectiveAccountId as never,
        categoryId: categoryId as never,
        amountMajor,
        source: "voice",
        voiceNotePath: path,
        voiceTranscript: transcript,
        paymentMethod: accountMethod(accounts, effectiveAccountId),
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      router.back();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(3), gap: space(3) }}
    >
      <Row between>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Speak it</Text>
        <Pressable onPress={() => canSave && save.mutate()} disabled={!canSave} hitSlop={10}>
          <Text style={[styles.save, !canSave && styles.saveOff]}>Save</Text>
        </Pressable>
      </Row>

      {/* Recorder */}
      <View style={styles.recordArea}>
        <Pressable style={[styles.recBtn, recState.isRecording && styles.recBtnActive]} onPress={toggleRecord}>
          <Ionicons name={recState.isRecording ? "stop" : "mic"} size={30} color={recState.isRecording ? "#fff" : colors.goldInk} />
        </Pressable>
        <Text style={styles.timer}>
          {recState.isRecording ? clock(recState.durationMillis) : uri ? "Recorded" : "Tap to record & say why"}
        </Text>
        {uri && !recState.isRecording ? (
          <Pressable style={styles.play} onPress={() => player.play()}>
            <Ionicons name="play" size={13} color={colors.gold} />
            <Text style={styles.playText}>Play back</Text>
          </Pressable>
        ) : null}
      </View>

      <Card style={{ backgroundColor: "rgba(233,180,76,0.08)", borderColor: "rgba(233,180,76,0.3)" }}>
        {transcribing ? (
          <Text style={styles.note}>🎙 Transcribing your note…</Text>
        ) : transcript ? (
          <Text style={styles.note}>
            🎙 “{transcript}”{"\n"}Fields pre-filled — check them below.
          </Text>
        ) : (
          <Text style={styles.note}>
            🎙 Your note is saved with the transaction. Record, then confirm the details below (they auto-fill once your Supabase transcribe function is set up).
          </Text>
        )}
      </Card>

      {/* Confirm fields */}
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

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
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
  screen: { backgroundColor: colors.bg },
  cancel: { color: colors.ink2, fontSize: 13 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  save: { color: colors.gold, fontSize: 13, fontWeight: "800" },
  saveOff: { color: colors.muted },
  recordArea: { alignItems: "center", gap: space(2), paddingVertical: space(3) },
  recBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  recBtnActive: { backgroundColor: colors.negative },
  timer: { color: colors.ink2, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  play: { flexDirection: "row", alignItems: "center", gap: 6 },
  playText: { color: colors.gold, fontSize: 12, fontWeight: "700" },
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
});
