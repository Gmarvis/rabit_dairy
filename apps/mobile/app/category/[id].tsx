import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CATEGORY_TYPES,
  PAYMENT_METHODS,
  type CategoryType,
  type PaymentMethod,
} from "@rabbit/domain";
import { PrimaryButton, Row, ScreenHeader } from "../../src/components/ui";
import { useContainer } from "../../src/lib/auth";
import { methodLabel } from "../../src/lib/format";
import { useTheme } from "../../src/theme/ThemeProvider";
import { radius, space, type Palette } from "../../src/theme/tokens";

const TYPE_LABEL: Record<CategoryType, string> = {
  income: "Income",
  fixed_expense: "Fixed expense",
  variable_expense: "Variable expense",
  savings: "Savings",
  business_cost: "Business cost",
};

/** Curated swatches — the categorical hues used across the app's charts. */
const SWATCHES = [
  "#26A876", "#2FBF87", "#3ED996", "#4E8FD9", "#6FA8E8",
  "#9085E9", "#E9B44C", "#BC8623", "#D95A4E", "#E06A5A",
  "#E97767", "#76867C",
];

export default function CategoryEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();
  const pal = useTheme();
  const s = makeStyles(pal);

  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";

  // The list query already holds every category; reuse it to seed the editor.
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => c.queries.categories.execute(c.userId),
  });
  const existing = useMemo(() => {
    if (isNew || !catData) return null;
    for (const g of catData.groups) {
      const hit = g.items.find((i) => i.id === id);
      if (hit) return hit;
    }
    return null;
  }, [catData, id, isNew]);

  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("variable_expense");
  const [color, setColor] = useState(SWATCHES[0]!);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate the form once the existing category loads.
  if (existing && !seeded) {
    setName(existing.name);
    setType(existing.type);
    setColor(existing.color);
    setMethod(existing.defaultPaymentMethod);
    setSeeded(true);
  }

  const canSave = name.trim().length > 0;

  const save = useMutation({
    mutationFn: async () => {
      const res = await c.commands.saveCategory.execute({
        userId: c.userId,
        id: isNew ? undefined : id,
        name: name.trim(),
        type,
        color,
        defaultPaymentMethod: method,
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save."),
  });

  const archive = useMutation({
    mutationFn: async () => {
      const res = await c.commands.archiveCategory.execute({
        userId: c.userId,
        id: id!,
        archived: true,
      });
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => { qc.invalidateQueries(); router.back(); },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not archive."),
  });

  function confirmArchive() {
    Alert.alert(
      "Archive category?",
      "It'll be hidden from pickers. Past transactions keep it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: () => archive.mutate() },
      ],
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <ScreenHeader
          title={isNew ? "New category" : "Edit category"}
          onClose={() => router.back()}
          topInset={insets.top}
        />

        <View>
          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries & Food"
            placeholderTextColor={pal.muted}
          />
        </View>

        <View>
          <Text style={s.label}>Type</Text>
          <View style={s.chipsWrap}>
            {CATEGORY_TYPES.map((opt) => (
              <Pressable key={opt} style={[s.chip, type === opt && s.chipOn]} onPress={() => setType(opt)}>
                <Text style={[s.chipText, type === opt && s.chipTextOn]}>{TYPE_LABEL[opt]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={s.label}>Colour</Text>
          <View style={s.swatchWrap}>
            {SWATCHES.map((hex) => (
              <Pressable
                key={hex}
                onPress={() => setColor(hex)}
                style={[s.swatch, { backgroundColor: hex }, color === hex && s.swatchOn]}
                accessibilityRole="button"
                accessibilityLabel={`Colour ${hex}`}
              >
                {color === hex ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={s.label}>Default payment method</Text>
          <View style={s.chipsWrap}>
            <Pressable style={[s.chip, method === null && s.chipOn]} onPress={() => setMethod(null)}>
              <Text style={[s.chipText, method === null && s.chipTextOn]}>None</Text>
            </Pressable>
            {PAYMENT_METHODS.map((m) => (
              <Pressable key={m} style={[s.chip, method === m && s.chipOn]} onPress={() => setMethod(m)}>
                <Text style={[s.chipText, method === m && s.chipTextOn]}>{methodLabel(m)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {!isNew ? (
          <Pressable onPress={confirmArchive} style={{ marginTop: space(2) }} disabled={archive.isPending}>
            <Text style={s.archive}>Archive category</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <PrimaryButton
          label={isNew ? "Add category" : "Save changes"}
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
  label: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  input: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3), color: c.ink, fontSize: 15 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
  chip: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(3), paddingVertical: space(2) },
  chipOn: { backgroundColor: c.gold, borderColor: c.gold },
  chipText: { color: c.ink2, fontSize: 12, fontWeight: "600" },
  chipTextOn: { color: c.goldInk },
  swatchWrap: { flexDirection: "row", flexWrap: "wrap", gap: space(3) },
  swatch: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: c.ink },
  error: { color: c.negative, fontSize: 12 },
  archive: { color: c.negative, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: space(2) },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
});
