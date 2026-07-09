import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { roleForType, type AccountRole, type AccountType } from "@rabbit/domain";
import { PrimaryButton, Row, ScreenHeader } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { useTheme } from "../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../src/theme/tokens";

const TYPES: { key: AccountType; label: string }[] = [
  { key: "bank_salary", label: "Current / Cheque" },
  { key: "bank_savings", label: "Savings" },
  { key: "bank_other", label: "Other bank" },
  { key: "mobile_money", label: "Mobile money" },
  { key: "cash", label: "Cash" },
];

const ROLES: { key: AccountRole; label: string; hint: string }[] = [
  { key: "spending", label: "Spending", hint: "Everyday money you can freely use." },
  { key: "savings", label: "Savings", hint: "Money set aside — its balance counts as saved." },
  { key: "credit", label: "Credit", hint: "Money you owe — subtracted from your total." },
];

export default function NewAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const pal = useTheme();
  const s = makeStyles(pal);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank_salary");
  const [role, setRole] = useState<AccountRole>(roleForType("bank_salary"));
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
        role,
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
              <Pressable
                key={opt.key}
                style={[s.chip, type === opt.key && s.chipOn]}
                onPress={() => { setType(opt.key); setRole(roleForType(opt.key)); }}
              >
                <Text style={[s.chipText, type === opt.key && s.chipTextOn]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={s.label}>Role</Text>
          <View style={s.chipsWrap}>
            {ROLES.map((opt) => (
              <Pressable key={opt.key} style={[s.chip, role === opt.key && s.chipOn]} onPress={() => setRole(opt.key)}>
                <Text style={[s.chipText, role === opt.key && s.chipTextOn]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.hint}>{ROLES.find((r) => r.key === role)?.hint}</Text>
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
          <Text style={s.label}>{role === "credit" ? "Amount owed (FCFA)" : "Opening balance (FCFA)"}</Text>
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
  hint: { color: c.muted, fontSize: 12, marginTop: 6, lineHeight: 16 },
  error: { color: c.negative, fontSize: 12 },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
});
