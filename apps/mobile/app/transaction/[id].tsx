import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod, TransactionId } from "@rabbit/domain";
import type { EntryAccountOption } from "@rabbit/application";
import { Card, ChipRow, Pill, PrimaryButton, Row, SectionLabel, Segment, SelectChip, Skeleton, SkeletonList, Tico, withAlpha } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { fullDate, methodLabel } from "../../src/lib/format";
import { iconForCategory } from "../../src/theme/icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../../src/theme/tokens";

type Group = "income" | "expense" | "savings";
const GROUP_TYPES: Record<Group, CategoryType[]> = {
  income: ["income"],
  expense: ["fixed_expense", "variable_expense", "business_cost"],
  savings: ["savings"],
};
const TYPE_LABEL: Record<CategoryType, string> = {
  income: "Income",
  fixed_expense: "Fixed expense",
  variable_expense: "Variable expense",
  savings: "Savings",
  business_cost: "Business cost",
};
function groupOf(type: CategoryType): Group {
  return (Object.keys(GROUP_TYPES) as Group[]).find((g) => GROUP_TYPES[g].includes(type))!;
}
function methodForAccount(type: AccountType): PaymentMethod {
  if (type === "mobile_money") return "mobile_money";
  if (type === "cash") return "cash";
  return "bank_transfer";
}
function accountMethod(accounts: EntryAccountOption[], id: string | null): PaymentMethod {
  const a = accounts.find((x) => x.id === id);
  return a ? methodForAccount(a.type) : "cash";
}

export default function TransactionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);
  const { id } = useLocalSearchParams<{ id: string }>();
  const txnId = id as TransactionId;

  const [editing, setEditing] = useState(false);
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
    onSuccess: () => { qc.invalidateQueries(); setEditing(false); },
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

  const out = txn ? txn.direction === "out" : false;
  const signed = txn ? `${out ? "−" : "+"}${Math.abs(txn.amountMajor).toLocaleString("en-US")}` : "";

  return (
    <View style={s.screen}>
      {/* Nav: Back on the left, Edit / Cancel-Save on the right. */}
      <Row between style={[s.nav, { paddingTop: Math.min(insets.top, space(2)) + space(2) }]}>
        <Pressable onPress={() => (editing ? setEditing(false) : router.back())} hitSlop={10} style={s.navBtn}>
          <Ionicons name="chevron-back" size={18} color={t.gold} />
          <Text style={s.navText}>{editing ? "Cancel" : "Back"}</Text>
        </Pressable>
        {txn && !editing ? (
          <Pressable onPress={() => setEditing(true)} hitSlop={10} accessibilityRole="button">
            <Text style={s.navTextMuted}>Edit</Text>
          </Pressable>
        ) : null}
      </Row>

      {isLoading ? (
        <View style={{ paddingHorizontal: space(4), gap: space(3) }}>
          <View style={{ alignItems: "center", gap: space(3), marginTop: space(2) }}>
            <Skeleton width={56} height={56} radius={18} />
            <Skeleton width={160} height={30} radius={10} />
          </View>
          <SkeletonList rows={4} />
        </View>
      ) : !txn ? (
        <Text style={s.dim}>This transaction no longer exists.</Text>
      ) : !editing ? (
        /* ---------- Detail view (screen 05) ---------- */
        <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6), gap: space(3) }}>
          <View style={{ alignItems: "center", marginTop: space(2) }}>
            <Tico icon={iconForCategory(txn.categoryName, txn.categoryType)} color={txn.categoryColor} size={56} />
            <Text style={[s.bigAmount, { color: out ? t.negative : t.positive }]}>
              {signed} <Text style={s.bigCur}>FCFA</Text>
            </Text>
            {txn.description ? <Text style={s.subtitle}>{txn.description}</Text> : null}
          </View>

          <Card>
            <DetailRow label="Category" value={txn.categoryName} s={s} />
            <DetailRow label="Type" s={s} right={<Pill tone="gold">{TYPE_LABEL[txn.categoryType]}</Pill>} />
            {txn.paymentMethod ? <DetailRow label="Method" value={methodLabel(txn.paymentMethod)} s={s} /> : null}
            <DetailRow label="Date" value={fullDate(txn.occurredAt)} s={s} last />
          </Card>

          {txn.voiceTranscript ? (
            <Card style={s.voiceCard}>
              <Row between>
                <Row style={{ gap: 6 }}>
                  <Ionicons name="mic" size={12} color={t.gold} />
                  <Text style={s.voiceLabel}>Voice note · why</Text>
                </Row>
              </Row>
              <Text style={s.transcript}>&ldquo;{txn.voiceTranscript}&rdquo;</Text>
            </Card>
          ) : null}

          {error ? <Text style={[s.error, { textAlign: "center" }]}>{error}</Text> : null}

          <Pressable onPress={confirmDelete} disabled={remove.isPending} hitSlop={8} accessibilityRole="button" style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={t.negative} />
            <Text style={s.delete}>{remove.isPending ? "Deleting…" : "Delete transaction"}</Text>
          </Pressable>
        </ScrollView>
      ) : (
        /* ---------- Edit form (scrollable — no cramped keypad) ---------- */
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6), gap: space(3) }}
            keyboardShouldPersistTaps="handled"
          >
            <Segment
              options={[
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
                { value: "savings", label: "Savings" },
              ]}
              value={group}
              onChange={(g) => { setGroup(g); setCategoryId(null); }}
            />

            <View style={{ alignItems: "center", marginTop: space(2) }}>
              <SectionLabel style={{ letterSpacing: 1.5 }}>Amount</SectionLabel>
              <TextInput
                style={s.amountInput}
                value={digits}
                onChangeText={(v) => { setError(null); setDigits(v.replace(/[^0-9]/g, "")); }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.muted}
              />
              <Text style={s.cur}>FCFA</Text>
            </View>

            <ChipRow label="Category">
              {categories.map((cat) => (
                <SelectChip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
              ))}
            </ChipRow>

            <ChipRow label="Account">
              {accounts.map((a) => (
                <SelectChip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
              ))}
            </ChipRow>

            <View>
              <Text style={s.label}>Note</Text>
              <TextInput
                style={s.note}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                placeholderTextColor={t.muted}
              />
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Pressable onPress={confirmDelete} disabled={remove.isPending} hitSlop={8} accessibilityRole="button" style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={t.negative} />
              <Text style={s.delete}>{remove.isPending ? "Deleting…" : "Delete transaction"}</Text>
            </Pressable>
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + space(3) }]}>
            <PrimaryButton label="Save changes" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
          </View>
        </>
      )}
    </View>
  );
}

function DetailRow({ label, value, right, s, last }: { label: string; value?: string; right?: React.ReactNode; s: ReturnType<typeof makeStyles>; last?: boolean }) {
  return (
    <Row between style={[s.detailRow, !last && s.detailBorder]}>
      <Text style={s.detailLabel}>{label}</Text>
      {right ?? <Text style={s.detailValue}>{value}</Text>}
    </Row>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  nav: { paddingHorizontal: space(4), paddingBottom: space(3) },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  navText: { color: c.gold, fontSize: 15, fontWeight: "700" },
  navTextMuted: { color: c.ink2, fontSize: 15, fontWeight: "600" },
  dim: { color: c.ink2, fontSize: 13, paddingHorizontal: space(4), marginTop: space(4) },
  bigAmount: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5, marginTop: space(3), fontVariant: ["tabular-nums"] },
  bigCur: { fontSize: 16, color: c.ink2, fontWeight: "700" },
  subtitle: { color: c.ink, fontSize: 15, fontWeight: "600", marginTop: 4 },
  detailRow: { paddingVertical: space(2.5) },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: c.line },
  detailLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  detailValue: { color: c.ink, fontSize: 14, fontWeight: "600" },
  voiceCard: { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  voiceLabel: { color: c.gold, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  transcript: { color: c.ink, fontSize: 14, fontStyle: "italic", lineHeight: 20, marginTop: space(2) },
  delete: { color: c.negative, fontSize: 14, fontWeight: "700" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: space(2), paddingVertical: space(3), borderRadius: radius.md, borderWidth: 1, borderColor: withAlpha(c.negative, 0.35) },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line },
  // edit form
  label: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: space(2) },
  amountInput: { color: c.ink, fontSize: 48, fontWeight: "800", textAlign: "center", fontVariant: ["tabular-nums"], letterSpacing: -1, minWidth: 160, marginTop: space(2) },
  cur: { color: c.ink2, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginTop: space(1) },
  note: { backgroundColor: c.field, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3.5), color: c.ink, fontSize: 15 },
  error: { color: c.negative, fontSize: 13, fontWeight: "600" },
});
