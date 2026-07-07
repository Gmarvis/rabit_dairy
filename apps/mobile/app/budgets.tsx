import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Fragment, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearMonth, type CategoryType } from "@rabbit/domain";
import type { BudgetEditorItem } from "@rabbit/application";
import { Card, PrimaryButton, Row, ScreenHeader, SectionLabel } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { colors, radius, space } from "../src/theme/tokens";

const PERIOD = YearMonth.of(2026, 4);

const TYPE_LABEL: Record<CategoryType, string> = {
  income: "Income",
  fixed_expense: "Fixed expenses",
  variable_expense: "Variable expenses",
  savings: "Savings & investments",
  business_cost: "Business costs",
};
const TYPE_ORDER: CategoryType[] = [
  "fixed_expense", "variable_expense", "savings", "business_cost",
];

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const c = useContainer();

  const { data } = useQuery({
    queryKey: ["budgets", PERIOD.toString()],
    queryFn: () => c.queries.budgets.execute(c.userId, PERIOD),
  });

  // Local edit state: categoryId -> amount string.
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    setAmounts((prev) =>
      Object.keys(prev).length
        ? prev
        : Object.fromEntries(
            data.items.map((i) => [i.categoryId, i.amountMajor ? String(i.amountMajor) : ""]),
          ),
    );
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const items = data?.items ?? [];
      for (const it of items) {
        const raw = amounts[it.categoryId];
        const val = raw ? parseInt(raw, 10) : 0;
        if (Number.isNaN(val)) continue;
        await c.commands.setBudget.execute({
          userId: c.userId,
          categoryId: it.categoryId as never,
          year: PERIOD.year,
          month: PERIOD.month,
          amountMajor: val,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      router.back();
    },
  });

  const grouped = (type: CategoryType): BudgetEditorItem[] =>
    (data?.items ?? []).filter((i) => i.type === type);

  const total = Object.values(amounts).reduce(
    (sum, v) => sum + (v ? parseInt(v, 10) || 0 : 0),
    0,
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(3) }}>
        <ScreenHeader title={`Budgets · ${data?.periodLabel ?? ""}`.trim()} onClose={() => router.back()} topInset={insets.top} />

      {TYPE_ORDER.map((type) => {
        const items = grouped(type);
        if (items.length === 0) return null;
        return (
          <Fragment key={type}>
            <SectionLabel>{TYPE_LABEL[type]}</SectionLabel>
            <Card style={{ paddingVertical: space(1) }}>
              {items.map((it, i) => (
                <View key={it.categoryId} style={[styles.row, i < items.length - 1 && styles.border]}>
                  <View style={[styles.dot, { backgroundColor: it.color }]} />
                  <Text style={styles.cat}>{it.name}</Text>
                  <TextInput
                    style={styles.input}
                    value={amounts[it.categoryId] ?? ""}
                    onChangeText={(t) =>
                      setAmounts((p) => ({ ...p, [it.categoryId]: t.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              ))}
            </Card>
          </Fragment>
        );
      })}

        <Card hero>
          <Row between>
            <SectionLabel>Total budgeted</SectionLabel>
            <Text style={styles.total}>{total.toLocaleString("en-US")} FCFA</Text>
          </Row>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <PrimaryButton label="Save budgets" onPress={() => save.mutate()} loading={save.isPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2) },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dot: { width: 10, height: 10, borderRadius: 3 },
  cat: { color: colors.ink, fontSize: 12, fontWeight: "600", flex: 1 },
  input: {
    color: colors.ink, fontSize: 13, fontWeight: "700", textAlign: "right",
    minWidth: 90, fontVariant: ["tabular-nums"], paddingVertical: 4,
  },
  total: { color: colors.ink, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
