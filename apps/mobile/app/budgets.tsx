import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Fragment, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type CategoryType } from "@rabbit/domain";
import type { BudgetEditorItem } from "@rabbit/application";
import { Card, PageHeader, PrimaryButton, Row, SectionLabel, SkeletonList } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { usePeriod } from "../src/lib/period";
import { monthLabel } from "../src/lib/format";
import { space, type Palette } from "../src/theme/tokens";
import { useTheme } from "../src/theme/ThemeProvider";

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
  const t = useTheme();
  const s = makeStyles(t);
  const { period } = usePeriod();

  const { data } = useQuery({
    queryKey: ["budgets", period.toString()],
    queryFn: () => c.queries.budgets.execute(c.userId, period),
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
          year: period.year,
          month: period.month,
          amountMajor: val,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      router.back();
    },
  });

  const [copying, setCopying] = useState(false);
  function copyLastMonth() {
    Alert.alert(
      "Copy last month's budgets?",
      "This replaces every amount here with last month's — including anything you've just typed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: async () => {
            setCopying(true);
            try {
              const prev = await c.queries.budgets.execute(c.userId, period.previous());
              setAmounts(Object.fromEntries(prev.items.map((i) => [i.categoryId, i.amountMajor ? String(i.amountMajor) : ""])));
            } finally {
              setCopying(false);
            }
          },
        },
      ],
    );
  }

  const grouped = (type: CategoryType): BudgetEditorItem[] =>
    (data?.items ?? []).filter((i) => i.type === type);

  const total = Object.values(amounts).reduce(
    (sum, v) => sum + (v ? parseInt(v, 10) || 0 : 0),
    0,
  );

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), paddingTop: 0, gap: space(3) }}>
        <PageHeader
          eyebrow="Monthly budgets"
          title={monthLabel(period)}
          topInset={insets.top}
        />

      {!data ? (
        <>
          <SectionLabel>Fixed expenses</SectionLabel>
          <SkeletonList rows={3} />
          <SectionLabel>Variable expenses</SectionLabel>
          <SkeletonList rows={3} />
        </>
      ) : null}

      {TYPE_ORDER.map((type) => {
        const items = grouped(type);
        if (items.length === 0) return null;
        return (
          <Fragment key={type}>
            <SectionLabel>{TYPE_LABEL[type]}</SectionLabel>
            <Card style={{ paddingVertical: space(1) }}>
              {items.map((it, i) => (
                <View key={it.categoryId} style={[s.row, i < items.length - 1 && s.border]}>
                  <View style={[s.dot, { backgroundColor: it.color }]} />
                  <Text style={s.cat}>{it.name}</Text>
                  <TextInput
                    style={s.input}
                    value={amounts[it.categoryId] ?? ""}
                    onChangeText={(txt) =>
                      setAmounts((p) => ({ ...p, [it.categoryId]: txt.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={t.muted}
                    accessibilityLabel={`${it.name} budget in FCFA`}
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
            <Text style={s.total}>{total.toLocaleString("en-US")} FCFA</Text>
          </Row>
        </Card>

        <Pressable onPress={copyLastMonth} disabled={copying} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: space(2) }}>
          <Text style={[s.copy, copying && { opacity: 0.5 }]}>{copying ? "Copying…" : "Copy last month's budgets  →"}</Text>
        </Pressable>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + space(2) }]}>
        <PrimaryButton label="Save budgets" onPress={() => save.mutate()} loading={save.isPending} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    footer: { paddingHorizontal: space(4), paddingTop: space(2), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg },
    pencil: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" },
    row: { flexDirection: "row", alignItems: "center", gap: space(2.5), paddingVertical: space(2.5) },
    border: { borderBottomWidth: 1, borderBottomColor: c.line },
    dot: { width: 11, height: 11, borderRadius: 4 },
    cat: { color: c.ink, fontSize: 14, fontWeight: "600", flex: 1 },
    input: {
      color: c.ink, fontSize: 15, fontWeight: "700", textAlign: "right",
      minWidth: 90, fontVariant: ["tabular-nums"], paddingVertical: 4,
    },
    total: { color: c.ink, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
    copy: { color: c.gold, fontSize: 13, fontWeight: "700" },
  });
