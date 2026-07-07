import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType } from "@rabbit/domain";
import { PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { colors, radius, space } from "../src/theme/tokens";

const TYPES: { key: AccountType; label: string }[] = [
  { key: "bank_salary", label: "Salary" },
  { key: "bank_savings", label: "Savings" },
  { key: "bank_other", label: "Other bank" },
  { key: "mobile_money", label: "Mobile money" },
  { key: "cash", label: "Cash" },
];

export default function NewAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank_savings");
  const [institution, setInstitution] = useState("");
  const [mask, setMask] = useState("");
  const [opening, setOpening] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isBank = type.startsWith("bank_");
  const canSave = name.trim().length > 0;

  const save = useMutation({
    mutationFn: async () => {
      const res = await c.commands.createAccount.execute({
        userId: c.userId,
        name: name.trim(),
        type,
        institution: isBank ? institution : null,
        mask: isBank ? mask : null,
        openingBalanceMajor: opening ? parseInt(opening, 10) : 0,
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <ScreenHeader title="New account" onClose={() => router.back()} topInset={insets.top} />

        <Field label="Name">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. UBA savings" placeholderTextColor={colors.muted} />
        </Field>

        <View>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipsWrap}>
            {TYPES.map((t) => (
              <Pressable key={t.key} style={[styles.chip, type === t.key && styles.chipOn]} onPress={() => setType(t.key)}>
                <Text style={[styles.chipText, type === t.key && styles.chipTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isBank ? (
          <Row style={{ gap: space(2.5) }}>
            <Field label="Institution" style={{ flex: 1 }}>
              <TextInput style={styles.input} value={institution} onChangeText={setInstitution} placeholder="Afriland" placeholderTextColor={colors.muted} />
            </Field>
            <Field label="Last 4" style={{ flex: 1 }}>
              <TextInput style={styles.input} value={mask} onChangeText={(t) => setMask(t.replace(/[^0-9]/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="4821" placeholderTextColor={colors.muted} />
            </Field>
          </Row>
        ) : null}

        <Field label="Opening balance (FCFA)">
          <TextInput style={styles.input} value={opening} onChangeText={(t) => setOpening(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.muted} />
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <PrimaryButton label="Add account" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
      </View>
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  label: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3), color: colors.ink, fontSize: 15 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: colors.goldInk },
  error: { color: colors.negative, fontSize: 12 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
});
