import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType, CategoryType, PaymentMethod } from "@rabbit/domain";
import type { EntryAccountOption } from "@rabbit/application";
import { AmountHero, AmountKeypad, ChipRow, ModalHeader, Segment, SelectChip } from "../src/components/ui";
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
    if (key === "del") { setDigits((d) => d.slice(0, -1)); return; }
    setDigits((d) => {
      if (d === "" || d === "0") return key === "000" ? d : key;
      const next = d + key;
      return next.length <= 12 ? next : d;
    });
  }

  return (
    <View style={s.screen}>
      <View style={{ paddingHorizontal: space(4) }}>
        <ModalHeader
          title={`New ${group}`}
          onCancel={() => router.back()}
          topInset={insets.top}
          right={
            <Pressable onPress={() => canSave && save.mutate()} hitSlop={8} disabled={!canSave || save.isPending}>
              <View style={[s.savePill, !canSave && s.savePillOff]}>
                {save.isPending ? (
                  <ActivityIndicator size="small" color={pal.goldInk} />
                ) : (
                  <Text style={[s.saveText, !canSave && s.saveTextOff]}>Save</Text>
                )}
              </View>
            </Pressable>
          }
        />

        <Segment<Group>
          options={[
            { value: "income", label: "Income" },
            { value: "expense", label: "Expense" },
            { value: "savings", label: "Savings" },
          ]}
          value={group}
          onChange={(g) => { setGroup(g); setCategoryId(null); }}
        />
      </View>

      {/* Amount — the hero. Floats in the space between the segment and the
          input group so the screen reads as intentional, not empty. */}
      <View style={s.amountWrap}>
        <AmountHero value={amountMajor} caret />
      </View>

      <View style={{ paddingHorizontal: space(4), gap: space(3) }}>
        <ChipRow label="Category">
          {categories.map((cat) => (
            <SelectChip key={cat.id} label={cat.name} color={cat.color} selected={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
          ))}
        </ChipRow>

        <ChipRow label="Account">
          {accounts.map((a) => (
            <SelectChip key={a.id} label={a.name} selected={effectiveAccountId === a.id} onPress={() => setAccountId(a.id)} />
          ))}
        </ChipRow>

        <View>
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

      <View style={[s.bottom, { paddingBottom: insets.bottom + space(3) }]}>
        <AmountKeypad onKey={press} />
      </View>
    </View>
  );
}

function accountMethod(accounts: EntryAccountOption[], id: string | null): PaymentMethod {
  const a = accounts.find((x) => x.id === id);
  return a ? methodForAccount(a.type) : "cash";
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },

    savePill: { backgroundColor: c.gold, borderRadius: radius.pill, paddingHorizontal: space(3.5), paddingVertical: space(1.5), minWidth: 62, alignItems: "center", justifyContent: "center" },
    savePillOff: { backgroundColor: "transparent", paddingHorizontal: 0 },
    saveText: { color: c.goldInk, fontSize: 15, fontWeight: "800" },
    saveTextOff: { color: c.muted },

    segment: { flexDirection: "row", backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, padding: 3 },
    seg: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.sm, alignItems: "center" },
    segOn: { backgroundColor: c.gold, shadowColor: c.gold, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    segText: { color: c.ink2, fontSize: 13, fontWeight: "700" },
    segTextOn: { color: c.goldInk },

    amountWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space(4) },

    label: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: space(2) },
    note: { backgroundColor: c.field, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3.5), color: c.ink, fontSize: 15 },
    error: { color: c.negative, fontSize: 13, fontWeight: "600" },

    bottom: { paddingHorizontal: space(4), paddingTop: space(3) },
  });
