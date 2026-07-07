import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod, TransactionId } from "@rabbit/domain";
import type { EntryAccountOption } from "@rabbit/application";
import { Ionicons } from "@expo/vector-icons";
import { Card, PrimaryButton, Row, ScreenHeader } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { useTheme } from "../../src/theme/theme";
import { radius, space, type Palette } from "../../src/theme/tokens";

type Group = "income" | "expense" | "savings";
const GROUP_TYPES: Record<Group, CategoryType[]> = {
  income: ["income"],
  expense: ["fixed_expense", "variable_expense", "business_cost"],
  savings: ["savings"],
};
function groupOf(type: CategoryType): Group {
  return (Object.keys(GROUP_TYPES) as Group[]).find((g) => GROUP_TYPES[g].includes(type))!;
}
function methodForAccount(type: AccountType): PaymentMethod {
  if (type === "mobile_money") return "mobile_money";
  if (type === "cash") return "cash";
  return "bank_transfer";
}

export default function EditTransactionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const { c: t } = useTheme();
  const s = makeStyles(t);
  const { id } = useLocalSearchParams<{ id: string }>();
  const txnId = id as TransactionId;

  const [group, setGroup] = useState<Group>("expense");
  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: options } = useQuery({
    queryKey: ["entry-options"],
    queryFn: () => c.queries.entryOptions.execute(c.userId),
  });
  const { data: txn, isLoading } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => c.queries.transaction.execute(c.userId, txnId),
  });

  // Prefill once from the loaded transaction.
  useEffect(() => {
    if (!txn || loaded) return;
    setGroup(groupOf(txn.categoryType));
    setDigits(String(txn.amountMajor));
    setCategoryId(txn.categoryId);
    setAccountId(txn.accountId);
    setDescription(txn.description ?? "");
    setLoaded(true);
  }, [txn, loaded]);

  const accounts = options?.accounts ?? [];
  const categories = useMemo(
    () => (options?.categories ?? []).filter((cat) => GROUP_TYPES[group].includes(cat.type)),
    [options, group],
  );
  const amountMajor = parseInt(digits || "0", 10);
  const canSave = amountMajor > 0 && !!categoryId && !!accountId;

  const save = useMutation({
    mutationFn: async () => {
      const res = await c.commands.editTransaction.execute({
        userId: c.userId,
        transactionId: txnId,
        accountId: accountId as never,
        categoryId: categoryId as never,
        amountMajor,
        description: description.trim() || null,
        paymentMethod: accountMethod(accounts, accountId),
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await c.commands.deleteTransaction.execute({ userId: c.userId, transactionId: txnId });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not delete."),
  });

  function confirmDelete() {
    Alert.alert("Delete transaction?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
    ]);
  }

  function press(key: string) {
    setError(null);
    if (key === "del") setDigits((d) => d.slice(0, -1));
    else if (digits.length < 12) setDigits((d) => (d === "0" ? key : d + key));
  }

  if (isLoading || !txn) {
    return (
      <View style={s.screen}>
        <View style={{ paddingHorizontal: space(4) }}>
          <ScreenHeader title="Edit transaction" onClose={() => router.back()} topInset={insets.top} />
          <Text style={s.dim}>{isLoading ? "Loading…" : "This transaction no longer exists."}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <ScreenHeader title="Edit transaction" onClose={() => router.back()} topInset={insets.top} />

        <View style={s.segment}>
          {(["income", "expense", "savings"] as Group[]).map((g) => (
            <Pressable key={g} style={[s.seg, group === g && s.segOn]} onPress={() => { setGroup(g); setCategoryId(null); }}>
              <Text style={[s.segText, group === g && s.segTextOn]}>{g[0]!.toUpperCase() + g.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.amountBox}>
          <Text style={s.amountLabel}>Amount</Text>
          <Text style={[s.amount, amountMajor === 0 && s.amountZero]}>{amountMajor.toLocaleString("en-US")}</Text>
          <Text style={s.cur}>FCFA</Text>
        </View>

        <View>
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {categories.map((cat) => (
              <Chip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: space(3) }}>
          <Text style={s.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: space(3) }}>
          <Text style={s.label}>Note</Text>
          <TextInput
            style={s.note}
            value={description}
            onChangeText={setDescription}
            placeholder="What was this for?"
            placeholderTextColor={t.muted}
          />
        </View>

        {txn.voiceTranscript ? (
          <Card style={s.transcriptCard}>
            <Row style={{ gap: 6 }}>
              <Ionicons name="mic" size={12} color={t.gold} />
              <Text style={s.transcriptLabel}>Voice note · why</Text>
            </Row>
            <Text style={s.transcript}>&ldquo;{txn.voiceTranscript}&rdquo;</Text>
          </Card>
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
        <PrimaryButton label="Save changes" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
        <Pressable onPress={confirmDelete} disabled={remove.isPending} hitSlop={8}>
          <Text style={s.delete}>{remove.isPending ? "Deleting…" : "Delete transaction"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function accountMethod(accounts: EntryAccountOption[], id: string | null): PaymentMethod {
  const a = accounts.find((x) => x.id === id);
  return a ? methodForAccount(a.type) : "cash";
}

function Chip({ label, color, selected, onPress }: { label: string; color?: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const s = makeStyles(c);
  return (
    <Pressable style={[s.chip, selected && s.chipOn]} onPress={onPress}>
      {color ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  dim: { color: c.ink2, fontSize: 13, marginTop: space(4) },
  segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
  seg: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center" },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.ink2, fontSize: 12, fontWeight: "700" },
  segTextOn: { color: c.goldInk },
  amountBox: { alignItems: "center", marginVertical: space(3) },
  amountLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  amount: { color: c.ink, fontSize: 40, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"], letterSpacing: -1 },
  amountZero: { color: c.muted },
  cur: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  label: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: space(2) },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
  dot: { width: 9, height: 9, borderRadius: 3 },
  note: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2.5), color: c.ink, fontSize: 13 },
  transcriptCard: { marginTop: space(3), backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  transcriptLabel: { color: c.gold, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  transcript: { color: c.ink, fontSize: 13, fontStyle: "italic", lineHeight: 19, marginTop: space(2) },
  error: { color: c.negative, fontSize: 12, marginTop: space(2) },
  bottom: { paddingHorizontal: space(4), gap: space(3) },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(2) },
  key: { width: "31%", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  keyBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: c.ink, fontSize: 20, fontWeight: "700" },
  delete: { color: c.negative, fontSize: 13, fontWeight: "700", textAlign: "center" },
});
