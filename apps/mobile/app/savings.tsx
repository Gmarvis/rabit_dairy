import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { useTheme } from "../src/theme/theme";
import { radius, space, type Palette } from "../src/theme/tokens";

type Kind = "deposit" | "withdrawal";

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const { c: t } = useTheme();
  const s = makeStyles(t);

  const [kind, setKind] = useState<Kind>("deposit");
  const [digits, setDigits] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["entry-options"],
    queryFn: () => c.queries.entryOptions.execute(c.userId),
  });
  const savingsAccount = options?.accounts.find((a) => a.type === "bank_savings");
  const savingsCategory = options?.categories.find((cat) => cat.type === "savings");
  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!savingsAccount && !!savingsCategory;

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

  function press(key: string) {
    setError(null);
    if (key === "del") setDigits((d) => d.slice(0, -1));
    else if (digits.length < 12) setDigits((d) => (d === "0" ? key : d + key));
  }

  return (
    <View style={s.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <ScreenHeader
          title={kind === "deposit" ? "Record deposit" : "Record withdrawal"}
          onClose={() => router.back()}
          topInset={insets.top}
        />

        <View style={s.segment}>
          {(["deposit", "withdrawal"] as Kind[]).map((k) => (
            <Pressable key={k} style={[s.seg, kind === k && s.segOn]} onPress={() => setKind(k)}>
              <Ionicons
                name={k === "deposit" ? "arrow-down" : "arrow-up"}
                size={13}
                color={kind === k ? t.goldInk : t.ink2}
              />
              <Text style={[s.segText, kind === k && s.segTextOn]}>{k === "deposit" ? "Deposit" : "Withdrawal"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.amountBox}>
          <Text style={s.amountLabel}>Amount</Text>
          <Text style={[s.amount, amountMajor === 0 && s.amountZero]}>{amountMajor.toLocaleString("en-US")}</Text>
          <Text style={s.cur}>FCFA → {savingsAccount?.name ?? "savings"}</Text>
        </View>

        {receiptPath ? (
          <Row between style={s.receipt}>
            <Row style={{ gap: 6 }}>
              <Ionicons name="checkmark-circle" size={15} color={t.positive} />
              <Text style={[s.receiptText, { color: t.positive }]}>Receipt attached</Text>
            </Row>
            <Pressable onPress={() => setReceiptPath(null)}><Text style={s.receiptClear}>Remove</Text></Pressable>
          </Row>
        ) : (
          <Row style={{ gap: space(2.5) }}>
            <Pressable style={s.receiptBtn} onPress={() => attachReceipt("camera")}>
              <Ionicons name="camera" size={15} color={t.ink} />
              <Text style={s.receiptBtnText}>Snap receipt</Text>
            </Pressable>
            <Pressable style={s.receiptBtn} onPress={() => attachReceipt("library")}>
              <Ionicons name="image" size={15} color={t.ink} />
              <Text style={s.receiptBtnText}>Upload</Text>
            </Pressable>
          </Row>
        )}

        {!savingsAccount || !savingsCategory ? (
          <Text style={s.error}>Add a savings account and a savings category first.</Text>
        ) : null}
        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>

      <View style={{ flex: 1 }} />

      <View style={[s.bottom, { paddingBottom: insets.bottom + space(2) }]}>
        <View style={s.keypad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
            <Pressable key={i} style={[s.key, k === "" && s.keyBlank]} onPress={() => k && press(k)} disabled={k === ""}>
              <Text style={s.keyText}>{k === "del" ? "⌫" : k}</Text>
            </Pressable>
          ))}
        </View>
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
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, flexDirection: "row", gap: 5, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 12, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  amountBox: { alignItems: "center", marginVertical: space(4) },
  amountLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  amount: { color: c.ink, fontSize: 40, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"], letterSpacing: -1 },
  amountZero: { color: c.muted },
  cur: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  receipt: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3) },
  receiptText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  receiptClear: { color: c.gold, fontSize: 11, fontWeight: "700" },
  receiptBtn: { flex: 1, flexDirection: "row", gap: 6, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center", justifyContent: "center" },
  receiptBtnText: { color: c.ink, fontSize: 12, fontWeight: "700" },
  error: { color: c.negative, fontSize: 12, marginTop: space(2), textAlign: "center" },
  bottom: { paddingHorizontal: space(4), gap: space(3) },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(2) },
  key: { width: "31%", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  keyBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: c.ink, fontSize: 20, fontWeight: "700" },
});
