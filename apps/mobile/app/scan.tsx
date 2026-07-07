import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CategoryType } from "@rabbit/domain";
import type { EntryCategoryOption } from "@rabbit/application";
import { Card, Row, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { parseStatement, type ParsedRow } from "../src/lib/parseStatement";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

// Lottie is a native module — load defensively so a stale binary degrades to
// the static frame instead of crashing the route.
const LottieView = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("lottie-react-native").default as typeof import("lottie-react-native").default;
  } catch {
    return null;
  }
})();
const scanLineDark = require("../assets/lottie/scanLine.json");
const scanLineLight = require("../assets/lottie/scanLineLight.json");

interface ReviewRow {
  row: ParsedRow;
  include: boolean;
  categoryId: string | null;
}

/** Pick a category id for a parsed row: hint match, else a same-direction fallback. */
function resolveCategory(
  hint: string | null,
  direction: "in" | "out",
  cats: EntryCategoryOption[],
): string | null {
  if (hint) {
    const h = hint.toLowerCase();
    const m = cats.find((c) => c.name.toLowerCase().includes(h) || h.includes(c.name.toLowerCase()));
    if (m) return m.id;
  }
  const wantIncome = direction === "in";
  const fallback = cats.find((c) =>
    wantIncome ? c.type === "income" : (c.type as CategoryType) === "variable_expense",
  );
  return fallback?.id ?? cats[0]?.id ?? null;
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);

  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["entry-options"],
    queryFn: () => c.queries.entryOptions.execute(c.userId),
  });
  const accounts = options?.accounts ?? [];
  const cats = options?.categories ?? [];
  const effectiveAccountId =
    accountId ?? accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? null;

  async function pick(from: "camera" | "library") {
    setError(null);
    try {
      const perm =
        from === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setError("Permission needed to add the image.");

      const res = await (from === "camera"
        ? ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.5 }));
      if (res.canceled || !res.assets[0]?.base64) return;

      if (c.isDemo) {
        setError("Scanning needs your Supabase backend — add your keys to .env.");
        return;
      }
      setBusy(true);
      const asset = res.assets[0];
      const parsed = await parseStatement(asset.base64!, asset.mimeType ?? "image/jpeg", cats.map((x) => x.name));
      const review: ReviewRow[] = (parsed ?? []).map((r) => ({
        row: r,
        include: true,
        categoryId: resolveCategory(r.categoryHint, r.direction, cats),
      }));
      setRows(review);
      if (review.length === 0) setError("Couldn't read any transactions from that image.");
    } catch {
      setError("Couldn't read the statement. Try a clearer image.");
    } finally {
      setBusy(false);
    }
  }

  const selected = (rows ?? []).filter((r) => r.include && r.categoryId);

  const importMut = useMutation({
    mutationFn: async () => {
      const res = await c.commands.importStatement.execute({
        userId: c.userId,
        accountId: effectiveAccountId as never,
        entries: selected.map((r) => ({
          amountMajor: r.row.amountMajor,
          direction: r.row.direction,
          categoryId: r.categoryId!,
          occurredAt: r.row.date ? `${r.row.date}T09:00:00.000Z` : new Date().toISOString(),
          description: r.row.description,
        })),
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Import failed."),
  });

  function toggle(i: number) {
    setRows((rs) => rs?.map((r, j) => (j === i ? { ...r, include: !r.include } : r)) ?? null);
  }
  function nameFor(id: string | null) {
    return cats.find((c2) => c2.id === id)?.name ?? "Uncategorised";
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}
    >
      <ScreenHeader title="Scan statement" onClose={() => router.back()} topInset={insets.top} />

      {!rows ? (
        <>
          <View style={s.frame}>
            {LottieView ? (
              <LottieView
                autoPlay
                loop
                source={t.mode === "light" ? scanLineLight : scanLineDark}
                style={s.scanLine}
              />
            ) : null}
            <Ionicons name="camera" size={28} color={t.ink2} />
            <Text style={s.frameTitle}>Snap or upload a statement</Text>
            <Text style={s.frameSub}>A bank SMS, MoMo history, or a screenshot of your bank app.</Text>
          </View>
          {busy ? (
            <Row style={{ gap: space(2), justifyContent: "center" }}>
              <ActivityIndicator color={t.gold} />
              <Text style={s.dim}>Reading the statement…</Text>
            </Row>
          ) : (
            <Row style={{ gap: space(2.5) }}>
              <Action label="Capture" primary onPress={() => pick("camera")} />
              <Action label="Gallery" onPress={() => pick("library")} />
            </Row>
          )}
          <Row style={{ gap: 5, justifyContent: "center" }}>
            <Ionicons name="lock-closed" size={11} color={t.muted} />
            <Text style={s.privacy}>The image isn't stored — only the rows you confirm are saved.</Text>
          </Row>
          {error ? <Text style={s.error}>{error}</Text> : null}
        </>
      ) : (
        <>
          <Text style={s.dim}>Uncheck any row you don't want, then import. Add them to:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {accounts.map((a) => (
              <Pressable key={a.id} style={[s.chip, effectiveAccountId === a.id && s.chipOn]} onPress={() => setAccountId(a.id)}>
                <Text style={[s.chipText, effectiveAccountId === a.id && s.chipTextOn]}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Card style={{ paddingVertical: space(1) }}>
            {rows.map((r, i) => (
              <Pressable key={i} style={[s.rowItem, i < rows.length - 1 && s.border]} onPress={() => toggle(i)}>
                <Ionicons name={r.include ? "checkbox" : "square-outline"} size={20} color={r.include ? t.gold : t.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{r.row.description}</Text>
                  <Text style={s.rowMeta}>{nameFor(r.categoryId)}{r.row.date ? ` · ${r.row.date}` : ""}</Text>
                </View>
                <Text style={[s.amt, { color: r.row.direction === "out" ? t.negative : t.positive }]}>
                  {r.row.direction === "out" ? "−" : "+"}{r.row.amountMajor.toLocaleString("en-US")}
                </Text>
              </Pressable>
            ))}
          </Card>

          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable
            style={[s.importBtn, selected.length === 0 && s.importOff]}
            onPress={() => selected.length && importMut.mutate()}
            disabled={selected.length === 0 || importMut.isPending}
          >
            {importMut.isPending ? (
              <ActivityIndicator color={t.goldInk} />
            ) : (
              <Text style={s.importText}>Import {selected.length} transaction{selected.length === 1 ? "" : "s"}</Text>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Action({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  const c = useTheme();
  const s = makeStyles(c);
  return (
    <Pressable style={[s.action, primary && s.actionPrimary]} onPress={onPress}>
      <Text style={[s.actionText, primary && s.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  cancel: { color: c.ink2, fontSize: 13 },
  title: { color: c.ink, fontSize: 15, fontWeight: "800" },
  dim: { color: c.ink2, fontSize: 12 },
  frame: {
    borderWidth: 2, borderColor: c.line, borderStyle: "dashed",
    borderRadius: radius.lg, alignItems: "center", justifyContent: "center",
    gap: space(2), paddingVertical: space(8), paddingHorizontal: space(5),
  },
  scanLine: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.9 },
  frameTitle: { color: c.ink, fontSize: 13, fontWeight: "700" },
  frameSub: { color: c.ink2, fontSize: 11, textAlign: "center" },
  privacy: { color: c.muted, fontSize: 10, textAlign: "center" },
  error: { color: c.negative, fontSize: 12, textAlign: "center" },
  action: { flex: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center" },
  actionPrimary: { backgroundColor: c.gold, borderColor: c.gold },
  actionText: { color: c.ink, fontWeight: "700", fontSize: 13 },
  actionTextPrimary: { color: c.goldInk },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
  rowItem: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  rowTitle: { color: c.ink, fontSize: 12, fontWeight: "600" },
  rowMeta: { color: c.muted, fontSize: 10, marginTop: 1 },
  amt: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  importBtn: { backgroundColor: c.gold, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center" },
  importOff: { opacity: 0.5 },
  importText: { color: c.goldInk, fontWeight: "800", fontSize: 14 },
});
