import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import type { EntryAccountOption } from "@rabbit/application";
import { ModalHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

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
  const pal = useTheme();
  const s = makeStyles(pal);

  const [group, setGroup] = useState<Group>("expense");
  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState("");
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
        description: note.trim() || null,
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
    <View style={s.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <ModalHeader
          title={`New ${group}`}
          onCancel={() => router.back()}
          topInset={insets.top}
          right={
            <Pressable onPress={() => canSave && save.mutate()} hitSlop={10} disabled={!canSave}>
              <Text style={[s.save, { opacity: canSave ? 1 : 0.4 }]}>Save</Text>
            </Pressable>
          }
        />

        <View style={s.segment}>
          {(["income", "expense", "savings"] as Group[]).map((g) => (
            <Pressable key={g} style={[s.seg, group === g && s.segOn]} onPress={() => { setGroup(g); setCategoryId(null); }}>
              <Text style={[s.segText, group === g && s.segTextOn]}>{g[0]!.toUpperCase() + g.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.amountBox}>
          <Text style={s.amountLabel}>Amount</Text>
          <Text style={[s.amount, amountMajor === 0 && s.amountZero]}>
            {amountMajor.toLocaleString("en-US")}<Text style={s.cursor}>|</Text>
          </Text>
          <Text style={s.cur}>FCFA</Text>
        </View>

        <View>
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {categories.map((cat) => (
              <Chip key={cat.id} s={s} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: space(3) }}>
          <Text style={s.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {accounts.map((a) => (
              <Chip key={a.id} s={s} label={a.name} selected={effectiveAccountId === a.id} onPress={() => setAccountId(a.id)} />
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: space(3) }}>
          <Text style={s.label}>Note</Text>
          <TextInput
            style={s.note}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Barbershop, groceries at Casino"
            placeholderTextColor={pal.muted}
            returnKeyType="done"
            maxLength={80}
          />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>

      <View style={{ flex: 1 }} />

      <View style={[s.bottom, { paddingBottom: insets.bottom + space(3) }]}>
        <View style={s.keypad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k, i) => (
            <Pressable key={i} style={[s.key, k === "" && s.keyBlank]} onPress={() => k && k !== "." && press(k)} disabled={k === "" || k === "."}>
              {k === "del" ? (
                <Ionicons name="backspace-outline" size={22} color={pal.ink} />
              ) : (
                <Text style={s.keyText}>{k}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function accountMethod(accounts: EntryAccountOption[], id: string | null): PaymentMethod {
  const a = accounts.find((x) => x.id === id);
  return a ? methodForAccount(a.type) : "cash";
}

function Chip({ s, label, color, selected, onPress }: { s: ReturnType<typeof makeStyles>; label: string; color?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.chip, selected && s.chipOn]} onPress={onPress}>
      {color ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    save: { color: c.gold, fontSize: 15, fontWeight: "700" },
    cursor: { color: c.gold, fontWeight: "400" },
    segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
    seg: { flex: 1, paddingVertical: space(2), borderRadius: radius.sm, alignItems: "center" },
    segOn: { backgroundColor: c.gold },
    segText: { color: c.ink2, fontSize: 12, fontWeight: "700" },
    segTextOn: { color: c.goldInk },
    amountBox: { alignItems: "center", marginVertical: space(4) },
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
    note: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3), color: c.ink, fontSize: 15 },
    dot: { width: 9, height: 9, borderRadius: 3 },
    error: { color: c.negative, fontSize: 12, marginTop: space(2) },
    bottom: { paddingHorizontal: space(4), gap: space(3) },
    keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space(2) },
    key: { width: "31%", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingVertical: space(3), alignItems: "center" },
    keyBlank: { backgroundColor: "transparent", borderColor: "transparent" },
    keyText: { color: c.ink, fontSize: 20, fontWeight: "700" },
  });
