import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { colors, radius, space } from "../src/theme/tokens";

type Kind = "deposit" | "withdrawal";

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();

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
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <ScreenHeader
          title={kind === "deposit" ? "Record deposit" : "Record withdrawal"}
          onClose={() => router.back()}
          topInset={insets.top}
        />

        <View style={styles.segment}>
          {(["deposit", "withdrawal"] as Kind[]).map((k) => (
            <Pressable key={k} style={[styles.seg, kind === k && styles.segOn]} onPress={() => setKind(k)}>
              <Text style={[styles.segText, kind === k && styles.segTextOn]}>{k === "deposit" ? "↓ Deposit" : "↑ Withdrawal"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={[styles.amount, amountMajor === 0 && styles.amountZero]}>{amountMajor.toLocaleString("en-US")}</Text>
          <Text style={styles.cur}>FCFA → {savingsAccount?.name ?? "savings"}</Text>
        </View>

        {receiptPath ? (
          <Row between style={styles.receipt}>
            <Text style={[styles.receiptText, { color: colors.positive }]}>✓ Receipt attached</Text>
            <Pressable onPress={() => setReceiptPath(null)}><Text style={styles.receiptClear}>Remove</Text></Pressable>
          </Row>
        ) : (
          <Row style={{ gap: space(2.5) }}>
            <Pressable style={styles.receiptBtn} onPress={() => attachReceipt("camera")}><Text style={styles.receiptBtnText}>📷 Snap receipt</Text></Pressable>
            <Pressable style={styles.receiptBtn} onPress={() => attachReceipt("library")}><Text style={styles.receiptBtnText}>🖼 Upload</Text></Pressable>
          </Row>
        )}

        {!savingsAccount || !savingsCategory ? (
          <Text style={styles.error}>Add a savings account and a savings category first.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={{ flex: 1 }} />

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space(2) }]}>
        <View style={styles.keypad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
            <Pressable key={i} style={[styles.key, k === "" && styles.keyBlank]} onPress={() => k && press(k)} disabled={k === ""}>
              <Text style={styles.keyText}>{k === "del" ? "⌫" : k}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  segment: { flexDirection: "row", backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: colors.gold },
  segText: { color: colors.ink2, fontSize: 12, fontWeight: "700" },
  segTextOn: { color: colors.goldInk },
  amountBox: { alignItems: "center", marginVertical: space(4) },
  amountLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  amount: { color: colors.ink, fontSize: 40, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"], letterSpacing: -1 },
  amountZero: { color: colors.muted },
  cur: { color: colors.ink2, fontSize: 12, fontWeight: "600" },
  receipt: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3) },
  receiptText: { color: colors.ink2, fontSize: 12, fontWeight: "600" },
  receiptClear: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  receiptBtn: { flex: 1, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  receiptBtnText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  error: { color: colors.negative, fontSize: 12, marginTop: space(2), textAlign: "center" },
  bottom: { paddingHorizontal: space(4), gap: space(3) },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(2) },
  key: { width: "31%", backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  keyBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: colors.ink, fontSize: 20, fontWeight: "700" },
});
