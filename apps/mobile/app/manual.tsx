import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import type { EntryAccountOption } from "@rabbit/application";
import { PrimaryButton, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
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

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();

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

  const save = useMutation({
    mutationFn: async () => {
      const res = await c.commands.logTransaction.execute({
        userId: c.userId,
        accountId: effectiveAccountId as never,
        categoryId: categoryId as never,
        amountMajor,
        paymentMethod: accountMethod(accounts, effectiveAccountId),
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
        <ScreenHeader title="New transaction" onClose={() => router.back()} topInset={insets.top} />

        <View style={styles.segment}>
          {(["income", "expense", "savings"] as Group[]).map((g) => (
            <Pressable key={g} style={[styles.seg, group === g && styles.segOn]} onPress={() => { setGroup(g); setCategoryId(null); }}>
              <Text style={[styles.segText, group === g && styles.segTextOn]}>{g[0]!.toUpperCase() + g.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={[styles.amount, amountMajor === 0 && styles.amountZero]}>{amountMajor.toLocaleString("en-US")}</Text>
          <Text style={styles.cur}>FCFA</Text>
        </View>

        <View>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((cat) => (
              <Chip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: space(3) }}>
          <Text style={styles.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={effectiveAccountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </ScrollView>
        </View>

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
        <PrimaryButton label="Save transaction" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
      </View>
    </View>
  );
}

function accountMethod(accounts: EntryAccountOption[], id: string | null): PaymentMethod {
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
  label: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: space(2) },
  chips: { gap: space(2), paddingRight: space(4) },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: colors.goldInk },
  dot: { width: 9, height: 9, borderRadius: 3 },
  error: { color: colors.negative, fontSize: 12, marginTop: space(2) },
  bottom: { paddingHorizontal: space(4), gap: space(3) },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(2) },
  key: { width: "31%", backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
  keyBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  keyText: { color: colors.ink, fontSize: 20, fontWeight: "700" },
});
