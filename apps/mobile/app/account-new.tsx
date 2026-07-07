import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountType } from "@rabbit/domain";
import { PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

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
  const pal = useTheme();
  const s = makeStyles(pal);

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
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <ScreenHeader title="New account" onClose={() => router.back()} topInset={insets.top} />

        <View>
          <Text style={s.label}>Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. UBA savings" placeholderTextColor={pal.muted} />
        </View>

        <View>
          <Text style={s.label}>Type</Text>
          <View style={s.chipsWrap}>
            {TYPES.map((opt) => (
              <Pressable key={opt.key} style={[s.chip, type === opt.key && s.chipOn]} onPress={() => setType(opt.key)}>
                <Text style={[s.chipText, type === opt.key && s.chipTextOn]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isBank ? (
          <Row style={{ gap: space(2.5) }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Institution</Text>
              <TextInput style={s.input} value={institution} onChangeText={setInstitution} placeholder="Afriland" placeholderTextColor={pal.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Last 4</Text>
              <TextInput style={s.input} value={mask} onChangeText={(v) => setMask(v.replace(/[^0-9]/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="4821" placeholderTextColor={pal.muted} />
            </View>
          </Row>
        ) : null}

        <View>
          <Text style={s.label}>Opening balance (FCFA)</Text>
          <TextInput style={s.input} value={opening} onChangeText={(v) => setOpening(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="0" placeholderTextColor={pal.muted} />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <PrimaryButton label="Add account" onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  label: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  input: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3), color: c.ink, fontSize: 15 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
  error: { color: c.negative, fontSize: 12 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
});
