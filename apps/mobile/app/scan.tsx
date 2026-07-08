import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CategoryType } from "@rabbit/domain";
import type { EntryCategoryOption } from "@rabbit/application";
import { Card, ModalHeader, Row, withAlpha } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { parseDocument, type ParsedBalance, type ParsedRow } from "../src/lib/parseStatement";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

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
  const [balances, setBalances] = useState<ParsedBalance[] | null>(null);
  const [balanceIdx, setBalanceIdx] = useState(0);
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
      const doc = await parseDocument(asset.base64!, asset.mimeType ?? "image/jpeg", cats.map((x) => x.name));

      if (doc?.kind === "balance" && doc.balances.length) {
        setBalanceIdx(0);
        setBalances(doc.balances);
        return;
      }

      const review: ReviewRow[] = (doc?.rows ?? []).map((r) => ({
        row: r,
        include: true,
        categoryId: resolveCategory(r.categoryHint, r.direction, cats),
      }));
      setRows(review);
      if (review.length === 0) setError("Couldn't read anything from that image. Try a clearer photo.");
    } catch {
      setError("Couldn't read that image. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  }

  const reconcileMut = useMutation({
    mutationFn: async () => {
      const bal = balances?.[balanceIdx];
      if (!bal || !effectiveAccountId) throw new Error("Pick an account.");
      const res = await c.commands.reconcileBalance.execute({
        userId: c.userId,
        accountId: effectiveAccountId,
        targetMajor: bal.amountMajor,
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't update the balance."),
  });

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

  // Balance state — an account-balance screenshot was read.
  if (balances) {
    const bal = balances[balanceIdx];
    const accountName = accounts.find((a) => a.id === effectiveAccountId)?.name ?? "account";
    return (
      <View style={s.screen}>
        <View style={{ paddingHorizontal: space(4) }}>
          <Row between style={{ paddingTop: Math.min(insets.top, space(2)) + space(2), paddingBottom: space(3) }}>
            <Pressable onPress={() => { setBalances(null); setError(null); }} hitSlop={10} style={s.retake}>
              <Ionicons name="chevron-back" size={18} color={t.gold} />
              <Text style={s.upload}>Retake</Text>
            </Pressable>
            <Text style={s.reviewTitle}>Account balance</Text>
            <View style={{ width: 80 }} />
          </Row>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
          <Text style={s.reviewSub}>We read this balance from your screen. Pick the account to update — your logged transactions are kept.</Text>

          {balances.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {balances.map((b, i) => (
                <Pressable key={i} style={[s.chip, balanceIdx === i && s.chipOn]} onPress={() => setBalanceIdx(i)}>
                  <Text style={[s.chipText, balanceIdx === i && s.chipTextOn]}>
                    {b.label ? `${b.label} · ` : ""}{b.amountMajor.toLocaleString("en-US")}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Card style={{ alignItems: "center", paddingVertical: space(5) }}>
            <Text style={s.balLabel}>Detected balance</Text>
            <Text style={s.balAmount}>{(bal?.amountMajor ?? 0).toLocaleString("en-US")}</Text>
            <Text style={s.balCur}>FCFA</Text>
          </Card>

          <Text style={s.label}>Update which account?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {accounts.map((a) => (
              <Pressable key={a.id} style={[s.chip, effectiveAccountId === a.id && s.chipOn]} onPress={() => setAccountId(a.id)}>
                <Text style={[s.chipText, effectiveAccountId === a.id && s.chipTextOn]}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {error ? <Text style={s.error}>{error}</Text> : null}
        </ScrollView>
        <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
          <Pressable
            style={[s.importBtn, !effectiveAccountId && s.importOff]}
            onPress={() => effectiveAccountId && reconcileMut.mutate()}
            disabled={!effectiveAccountId || reconcileMut.isPending}
          >
            {reconcileMut.isPending ? (
              <ActivityIndicator color={t.goldInk} />
            ) : (
              <Text style={s.importText}>Update {accountName} balance</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // Capture state — a tall framed target that fills the sheet.
  if (!rows) {
    return (
      <View style={s.screen}>
        <View style={{ paddingHorizontal: space(4) }}>
          <ModalHeader
            title="Scan"
            onCancel={() => router.back()}
            topInset={insets.top}
            right={
              <Pressable onPress={() => pick("library")} hitSlop={10}>
                <Text style={s.upload}>Upload</Text>
              </Pressable>
            }
          />
        </View>

        <View style={s.frameWrap}>
          <View style={s.frame}>
            {busy ? (
              <>
                <ActivityIndicator color={t.gold} size="large" />
                <Text style={s.frameSub}>Reading it…</Text>
              </>
            ) : (
              <>
                <Ionicons name="camera" size={40} color={t.ink2} />
                <Text style={s.frameTitle}>Frame it</Text>
                <Text style={s.frameSub}>A receipt, a bank SMS or statement, or your balance screen — we read whichever it is. Or upload from your gallery.</Text>
              </>
            )}
            {/* Corner brackets */}
            <View style={[s.corner, s.cTL]} />
            <View style={[s.corner, s.cTR]} />
            <View style={[s.corner, s.cBL]} />
            <View style={[s.corner, s.cBR]} />
          </View>
        </View>

        <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
          <Row style={{ gap: space(3) }}>
            <Action label="Capture" primary onPress={() => pick("camera")} />
            <Action label="Gallery" onPress={() => pick("library")} />
          </Row>
          <Row style={{ gap: 6, justifyContent: "center", marginTop: space(3) }}>
            <Ionicons name="lock-closed" size={12} color={t.muted} />
            <Text style={s.privacy}>The image isn't stored — only the rows you confirm are saved.</Text>
          </Row>
          {error ? <Text style={[s.error, { marginTop: space(2) }]}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  // Review state — the parsed rows.
  const guessed = rows.find((r) => r.include && !r.row.categoryHint);
  return (
    <View style={s.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <Row between style={{ paddingTop: Math.min(insets.top, space(2)) + space(2), paddingBottom: space(3) }}>
          <Pressable onPress={() => setRows(null)} hitSlop={10} style={s.retake}>
            <Ionicons name="chevron-back" size={18} color={t.gold} />
            <Text style={s.upload}>Retake</Text>
          </Pressable>
          <Text style={s.reviewTitle}>Review {rows.length} rows</Text>
          <View style={{ width: 80 }} />
        </Row>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <Text style={s.reviewSub}>We read these from your statement. Uncheck any you don't want, fix a category, then import.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {accounts.map((a) => (
            <Pressable key={a.id} style={[s.chip, effectiveAccountId === a.id && s.chipOn]} onPress={() => setAccountId(a.id)}>
              <Text style={[s.chipText, effectiveAccountId === a.id && s.chipTextOn]}>{a.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Card style={{ paddingVertical: space(1) }}>
          {rows.map((r, i) => (
            <Pressable key={i} style={[s.rowItem, i < rows.length - 1 && s.border, !r.include && { opacity: 0.5 }]} onPress={() => toggle(i)}>
              <View style={[s.check, r.include ? s.checkOn : s.checkOff]}>
                {r.include ? <Ionicons name="checkmark" size={15} color={t.goldInk} /> : null}
              </View>
              <Text style={s.rowTitle}>{r.row.description}</Text>
              <Text style={[s.amt, { color: r.row.direction === "out" ? t.negative : t.positive }]}>
                {r.row.direction === "out" ? "−" : "+"}{r.row.amountMajor.toLocaleString("en-US")}
              </Text>
            </Pressable>
          ))}
        </Card>

        {guessed ? (
          <Card style={s.hint}>
            <Row style={{ gap: 6 }}>
              <Ionicons name="information-circle" size={15} color={t.blue} />
              <Text style={s.hintTitle}>Needs a category</Text>
            </Row>
            <Text style={s.hintText}>
              We guessed <Text style={{ fontWeight: "800", color: t.ink }}>{nameFor(guessed.categoryId)}</Text> for “{guessed.row.description}”. You can change it after import.
            </Text>
          </Card>
        ) : null}

        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
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
      </View>
    </View>
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

const BRACKET = 28;
const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  upload: { color: c.gold, fontSize: 15, fontWeight: "700" },
  dim: { color: c.ink2, fontSize: 13 },
  frameWrap: { flex: 1, paddingHorizontal: space(4), paddingVertical: space(2) },
  frame: {
    flex: 1, borderRadius: radius.xl, alignItems: "center", justifyContent: "center",
    gap: space(3), paddingHorizontal: space(6),
    borderWidth: 1, borderColor: c.line, backgroundColor: c.card2,
  },
  corner: { position: "absolute", width: BRACKET, height: BRACKET, borderColor: c.gold },
  cTL: { top: 12, left: 12, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cTR: { top: 12, right: 12, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cBL: { bottom: 12, left: 12, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cBR: { bottom: 12, right: 12, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  frameTitle: { color: c.ink, fontSize: 18, fontWeight: "800" },
  frameSub: { color: c.ink2, fontSize: 14, textAlign: "center", lineHeight: 20 },
  privacy: { color: c.muted, fontSize: 12, textAlign: "center" },
  error: { color: c.negative, fontSize: 13, textAlign: "center" },
  footer: { paddingHorizontal: space(4), paddingTop: space(3) },
  retake: { flexDirection: "row", alignItems: "center", gap: 2, width: 80 },
  reviewTitle: { color: c.ink, fontSize: 16, fontWeight: "800" },
  reviewSub: { color: c.ink2, fontSize: 14, lineHeight: 20 },
  label: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  balLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  balAmount: { color: c.ink, fontSize: 40, fontWeight: "800", marginTop: 6, fontVariant: ["tabular-nums"], letterSpacing: -1 },
  balCur: { color: c.ink2, fontSize: 12, fontWeight: "600", marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: c.gold },
  checkOff: { borderWidth: 2, borderColor: c.muted },
  hint: { backgroundColor: withAlpha(c.blue, 0.1), borderColor: withAlpha(c.blue, 0.3) },
  hintTitle: { color: c.blue, fontSize: 13, fontWeight: "800" },
  hintText: { color: c.ink2, fontSize: 13, lineHeight: 19, marginTop: space(2) },
  action: { flex: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.lg, paddingVertical: space(4), alignItems: "center" },
  actionPrimary: { backgroundColor: c.gold, borderColor: c.gold },
  actionText: { color: c.ink, fontWeight: "800", fontSize: 15 },
  actionTextPrimary: { color: c.goldInk },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3.5), paddingVertical: space(2.5) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
  rowItem: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(3) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  rowTitle: { color: c.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: c.muted, fontSize: 12, marginTop: 2 },
  amt: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  importBtn: { backgroundColor: c.gold, borderRadius: radius.lg, paddingVertical: space(4), alignItems: "center" },
  importOff: { opacity: 0.5 },
  importText: { color: c.goldInk, fontWeight: "800", fontSize: 15 },
});
