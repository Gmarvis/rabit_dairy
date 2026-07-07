import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CategoryType } from "@rabbit/domain";
import type { EntryCategoryOption } from "@rabbit/application";
import { Card, Row } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { parseStatement, type ParsedRow } from "../src/lib/parseStatement";
import { colors, radius, space } from "../src/theme/tokens";

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
      style={styles.screen}
      contentContainerStyle={{ padding: space(4), paddingTop: insets.top + space(3), gap: space(3) }}
    >
      <Row between>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.cancel}>Cancel</Text></Pressable>
        <Text style={styles.title}>Scan statement</Text>
        <View style={{ width: 44 }} />
      </Row>

      {!rows ? (
        <>
          <View style={styles.frame}>
            <Ionicons name="camera" size={28} color={colors.ink2} />
            <Text style={styles.frameTitle}>Snap or upload a statement</Text>
            <Text style={styles.frameSub}>A bank SMS, MoMo history, or a screenshot of your bank app.</Text>
          </View>
          {busy ? (
            <Row style={{ gap: space(2), justifyContent: "center" }}>
              <ActivityIndicator color={colors.gold} />
              <Text style={styles.dim}>Reading the statement…</Text>
            </Row>
          ) : (
            <Row style={{ gap: space(2.5) }}>
              <Action label="Capture" primary onPress={() => pick("camera")} />
              <Action label="Gallery" onPress={() => pick("library")} />
            </Row>
          )}
          <Text style={styles.privacy}>The image isn't stored — only the rows you confirm are saved. 🔒</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      ) : (
        <>
          <Text style={styles.dim}>Uncheck any row you don't want, then import. Add them to:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {accounts.map((a) => (
              <Pressable key={a.id} style={[styles.chip, effectiveAccountId === a.id && styles.chipOn]} onPress={() => setAccountId(a.id)}>
                <Text style={[styles.chipText, effectiveAccountId === a.id && styles.chipTextOn]}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Card style={{ paddingVertical: space(1) }}>
            {rows.map((r, i) => (
              <Pressable key={i} style={[styles.rowItem, i < rows.length - 1 && styles.border]} onPress={() => toggle(i)}>
                <Ionicons name={r.include ? "checkbox" : "square-outline"} size={20} color={r.include ? colors.gold : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.row.description}</Text>
                  <Text style={styles.rowMeta}>{nameFor(r.categoryId)}{r.row.date ? ` · ${r.row.date}` : ""}</Text>
                </View>
                <Text style={[styles.amt, { color: r.row.direction === "out" ? colors.negative : colors.positive }]}>
                  {r.row.direction === "out" ? "−" : "+"}{r.row.amountMajor.toLocaleString("en-US")}
                </Text>
              </Pressable>
            ))}
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.importBtn, selected.length === 0 && styles.importOff]}
            onPress={() => selected.length && importMut.mutate()}
            disabled={selected.length === 0 || importMut.isPending}
          >
            {importMut.isPending ? (
              <ActivityIndicator color={colors.goldInk} />
            ) : (
              <Text style={styles.importText}>Import {selected.length} transaction{selected.length === 1 ? "" : "s"}</Text>
            )}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Action({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.action, primary && styles.actionPrimary]} onPress={onPress}>
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  cancel: { color: colors.ink2, fontSize: 13 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  dim: { color: colors.ink2, fontSize: 12 },
  frame: {
    borderWidth: 2, borderColor: "rgba(255,255,255,0.18)", borderStyle: "dashed",
    borderRadius: radius.lg, alignItems: "center", justifyContent: "center",
    gap: space(2), paddingVertical: space(8), paddingHorizontal: space(5),
  },
  frameTitle: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  frameSub: { color: colors.ink2, fontSize: 11, textAlign: "center" },
  privacy: { color: colors.muted, fontSize: 10, textAlign: "center" },
  error: { color: colors.negative, fontSize: 12, textAlign: "center" },
  action: { flex: 1, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center" },
  actionPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  actionText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  actionTextPrimary: { color: colors.goldInk },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: colors.goldInk },
  rowItem: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowTitle: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  rowMeta: { color: colors.muted, fontSize: 10, marginTop: 1 },
  amt: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  importBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center" },
  importOff: { opacity: 0.5 },
  importText: { color: colors.goldInk, fontWeight: "800", fontSize: 14 },
});
