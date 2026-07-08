import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalHeader, PrimaryButton, Row } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { fullDate } from "../src/lib/format";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

type Kind = "deposit" | "withdrawal";

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);

  const [kind, setKind] = useState<Kind>("deposit");
  const [digits, setDigits] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["entry-options"],
    queryFn: () => c.queries.entryOptions.execute(c.userId),
  });
  const savingsAccount = options?.accounts.find((a) => a.type === "bank_savings");
  const savingsCategory = options?.categories.find((cat) => cat.type === "savings");
  const fundingAccounts = (options?.accounts ?? []).filter((a) => a.id !== savingsAccount?.id);
  const effectiveFunding = fundingId ?? fundingAccounts[0]?.id ?? null;
  const fundingName = fundingAccounts.find((a) => a.id === effectiveFunding)?.name ?? "account";
  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!savingsAccount && !!savingsCategory && !!effectiveFunding;
  const today = fullDate(new Date().toISOString());

  async function attachReceipt(from: "camera" | "library") {
    setError(null);
    try {
      const perm =
        from === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setError("Permission needed to add the receipt.");
      const res = await (from === "camera"
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
      const res = await c.commands.recordSavings.execute({
        userId: c.userId,
        savingsAccountId: savingsAccount!.id as never,
        fundingAccountId: effectiveFunding as never,
        savingsCategoryId: savingsCategory!.id as never,
        kind,
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
          title={kind === "deposit" ? "Record deposit" : "Record withdrawal"}
          onCancel={() => router.back()}
          topInset={insets.top}
          right={
            <Pressable onPress={() => canSave && save.mutate()} hitSlop={10} disabled={!canSave}>
              <Text style={[s.save, { opacity: canSave ? 1 : 0.4 }]}>Save</Text>
            </Pressable>
          }
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(4) }}>
        <View style={s.segment}>
          {(["deposit", "withdrawal"] as Kind[]).map((k) => (
            <Pressable key={k} style={[s.seg, kind === k && s.segOn]} onPress={() => setKind(k)}>
              <Ionicons name={k === "deposit" ? "arrow-down" : "arrow-up"} size={14} color={kind === k ? t.goldInk : t.ink2} />
              <Text style={[s.segText, kind === k && s.segTextOn]}>{k === "deposit" ? "Deposit" : "Withdrawal"}</Text>
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
              ? `${fundingName} → ${savingsAccount?.name ?? "Savings"}`
              : `${savingsAccount?.name ?? "Savings"} → ${fundingName}`}
          </Text>
        </View>

        <View>
          <Text style={s.label}>{kind === "deposit" ? "Move from" : "Move to"}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingRight: space(4) }}>
            {fundingAccounts.map((a) => (
              <Pressable
                key={a.id}
                style={[s.chip, effectiveFunding === a.id && s.chipOn]}
                onPress={() => setFundingId(a.id)}
              >
                <Text style={[s.chipText, effectiveFunding === a.id && s.chipTextOn]}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

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

        {!savingsAccount || !savingsCategory ? (
          <Text style={s.error}>Add a savings account and a savings category first.</Text>
        ) : null}
        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
        <PrimaryButton
          label={kind === "deposit" ? "Save deposit" : "Save withdrawal"}
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
  save: { color: c.gold, fontSize: 15, fontWeight: "700" },
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: space(2.5), borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 13, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  label: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: space(2) },
  chip: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
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
  footer: { paddingHorizontal: space(4), paddingTop: space(2) },
});
