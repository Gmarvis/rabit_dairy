import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChipRow, ModalHeader, PrimaryButton, Row, SelectChip, withAlpha } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { fullDate } from "../src/lib/format";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

type Kind = "deposit" | "withdrawal";

export default function TransferScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { focus, dir } = useLocalSearchParams<{ focus?: string; dir?: string }>();

  const [kind, setKind] = useState<Kind>(dir === "withdrawal" ? "withdrawal" : "deposit");
  const [digits, setDigits] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["entry-options"],
    queryFn: () => c.queries.entryOptions.execute(c.userId),
  });
  const accounts = options?.accounts ?? [];
  // The account in focus (the one you opened this from) — default to primary.
  const focusAccount =
    accounts.find((a) => a.id === focus) ?? accounts.find((a) => a.isPrimary) ?? accounts[0];
  const otherAccounts = accounts.filter((a) => a.id !== focusAccount?.id);
  const effectiveOther = otherId ?? otherAccounts[0]?.id ?? null;
  const otherName = otherAccounts.find((a) => a.id === effectiveOther)?.name ?? "account";

  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!focusAccount && !!effectiveOther;
  const today = fullDate(new Date().toISOString());

  // Deposit = money into the focus account; withdrawal = money out of it.
  const from = kind === "deposit" ? effectiveOther : focusAccount?.id ?? null;
  const to = kind === "deposit" ? focusAccount?.id ?? null : effectiveOther;

  async function attachReceipt(source: "camera" | "library") {
    setError(null);
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setError(source === "camera" ? "Camera access is needed to snap a receipt." : "Photo access is needed to attach a receipt.");
      const res = await (source === "camera"
        ? ImagePicker.launchCameraAsync({ quality: 0.5 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5 }));
      if (res.canceled || !res.assets[0]) return;
      const { path } = await c.storage.upload("receipts", res.assets[0].uri, "image/jpeg");
      setReceiptPath(path);
    } catch {
      setError("Couldn't attach the receipt.");
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const res = await c.commands.recordTransfer.execute({
        userId: c.userId,
        fromAccountId: from as never,
        toAccountId: to as never,
        amountMajor,
        receiptPath,
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  return (
    <View style={s.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <ModalHeader
          title={kind === "deposit" ? "Move money in" : "Move money out"}
          onCancel={() => router.back()}
          topInset={insets.top}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(4) }}>
        {accounts.length < 2 ? (
          <View style={s.notice}>
            <Ionicons name="alert-circle-outline" size={16} color={t.negative} />
            <Text style={s.noticeText}>Add a second account first — a transfer moves money between two of your accounts.</Text>
          </View>
        ) : null}

        <View style={s.segment}>
          {(["deposit", "withdrawal"] as Kind[]).map((k) => (
            <Pressable key={k} style={[s.seg, kind === k && s.segOn]} onPress={() => setKind(k)}>
              <Ionicons name={k === "deposit" ? "arrow-down" : "arrow-up"} size={14} color={kind === k ? t.goldInk : t.ink2} />
              <Text style={[s.segText, kind === k && s.segTextOn]}>{k === "deposit" ? "Money in" : "Money out"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ alignItems: "center", marginTop: space(2) }}>
          <Text style={s.label}>Amount</Text>
          <TextInput
            style={s.amount}
            value={digits}
            onChangeText={(v) => { setError(null); setDigits(v.replace(/[^0-9]/g, "")); }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={t.muted}
          />
          <Text style={s.cur}>
            FCFA · {kind === "deposit"
              ? `${otherName} → ${focusAccount?.name ?? "account"}`
              : `${focusAccount?.name ?? "account"} → ${otherName}`}
          </Text>
        </View>

        <ChipRow label={kind === "deposit" ? "From" : "To"}>
          {otherAccounts.map((a) => (
            <SelectChip key={a.id} label={a.name} selected={effectiveOther === a.id} onPress={() => setOtherId(a.id)} />
          ))}
        </ChipRow>

        <View style={s.field}>
          <Text style={s.fieldLabel}>Date</Text>
          <Text style={s.fieldValue}>{today}</Text>
        </View>

        <View>
          <Text style={s.label}>Proof</Text>
          {receiptPath ? (
            <View style={[s.proofCard, { borderColor: t.goldBorder }]}>
              <View style={s.thumb}><Ionicons name="receipt-outline" size={22} color={t.gold} /></View>
              <View style={{ flex: 1 }}>
                <Row style={{ gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={15} color={t.positive} />
                  <Text style={[s.proofTitle, { color: t.positive }]}>Receipt attached</Text>
                </Row>
                <Pressable onPress={() => setReceiptPath(null)}><Text style={s.proofClear}>Retake / remove</Text></Pressable>
              </View>
            </View>
          ) : (
            <Row style={{ gap: space(3) }}>
              <Pressable style={s.proofBtn} onPress={() => attachReceipt("camera")}>
                <Ionicons name="camera" size={16} color={t.ink} />
                <Text style={s.proofBtnText}>Snap</Text>
              </Pressable>
              <Pressable style={s.proofBtn} onPress={() => attachReceipt("library")}>
                <Ionicons name="image" size={16} color={t.ink} />
                <Text style={s.proofBtnText}>Upload</Text>
              </Pressable>
            </Row>
          )}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
        <PrimaryButton
          label={kind === "deposit" ? "Move money in" : "Move money out"}
          onPress={() => save.mutate()}
          disabled={!canSave}
          loading={save.isPending}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: space(2.5), borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 13, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  label: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: space(2) },
  amount: { color: c.ink, fontSize: 44, fontWeight: "800", textAlign: "center", fontVariant: ["tabular-nums"], letterSpacing: -1, minWidth: 180 },
  cur: { color: c.ink2, fontSize: 13, fontWeight: "600", marginTop: 2 },
  field: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  fieldValue: { color: c.ink, fontSize: 14, fontWeight: "600" },
  proofCard: { flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: c.card, borderWidth: 1, borderRadius: radius.md, padding: space(3) },
  thumb: { width: 48, height: 56, borderRadius: 9, backgroundColor: c.card2, alignItems: "center", justifyContent: "center" },
  proofTitle: { fontSize: 13, fontWeight: "800" },
  proofClear: { color: c.gold, fontSize: 12, fontWeight: "700", marginTop: 4 },
  proofBtn: { flex: 1, flexDirection: "row", gap: 8, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center", justifyContent: "center" },
  proofBtnText: { color: c.ink, fontSize: 14, fontWeight: "700" },
  error: { color: c.negative, fontSize: 13, textAlign: "center" },
  notice: { flexDirection: "row", alignItems: "center", gap: space(2), backgroundColor: withAlpha(c.negative, 0.1), borderColor: withAlpha(c.negative, 0.3), borderWidth: 1, borderRadius: radius.md, padding: space(3) },
  noticeText: { color: c.ink2, fontSize: 13, flex: 1, lineHeight: 18 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2) },
});
