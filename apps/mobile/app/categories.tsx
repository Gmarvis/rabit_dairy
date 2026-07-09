import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, PageHeader, Row, SectionLabel, SkeletonList } from "../src/components/ui";
import { useContainer } from "../src/lib/auth";
import { methodLabel } from "../src/lib/format";
import { useTheme } from "../src/theme/ThemeProvider";
import { space, type Palette } from "../src/theme/tokens";

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useContainer();
  const t = useTheme();
  const s = makeStyles(t);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => c.queries.categories.execute(c.userId),
  });

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(6) }}
    >
      <PageHeader
        title="Categories"
        topInset={insets.top}
        right={
          <Pressable
            style={s.add}
            onPress={() => router.push("/category/new")}
            accessibilityRole="button"
            accessibilityLabel="New category"
          >
            <Ionicons name="add" size={24} color={t.goldInk} />
          </Pressable>
        }
      />

      {isLoading || !data ? (
        <View style={{ marginTop: space(4), gap: space(3) }}>
          <SkeletonList rows={4} />
          <SkeletonList rows={3} />
        </View>
      ) : data.groups.length === 0 ? (
        <Card>
          <Text style={s.emptyTitle}>No categories yet</Text>
          <Text style={s.emptySub}>Tap + to add your first one.</Text>
        </Card>
      ) : (
        <>
          {data.groups.map((g) => (
            <View key={g.type} style={{ marginTop: space(4) }}>
              <SectionLabel>{g.label}</SectionLabel>
              <Card style={{ paddingVertical: space(1), marginTop: space(2.5) }}>
                {g.items.map((item, i) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/category/${item.id}`)}
                  >
                    <Row style={[s.row, i < g.items.length - 1 && s.border]}>
                      <View style={[s.swatch, { backgroundColor: item.color }]} />
                      <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                      {item.defaultPaymentMethod ? (
                        <Text style={s.meta}>{methodLabel(item.defaultPaymentMethod)}</Text>
                      ) : null}
                    </Row>
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}
          <Text style={s.caption}>
            {data.total} categor{data.total === 1 ? "y" : "ies"} across {data.typeCount} type
            {data.typeCount === 1 ? "" : "s"}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { backgroundColor: c.bg },
  add: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: c.gold,
    alignItems: "center", justifyContent: "center",
  },
  dim: { color: c.ink2, marginTop: space(4) },
  row: { gap: space(3.5), paddingVertical: space(3.5) },
  border: { borderBottomWidth: 1, borderBottomColor: c.line },
  swatch: { width: 14, height: 14, borderRadius: 5 },
  name: { flex: 1, color: c.ink, fontSize: 15, fontWeight: "600" },
  meta: { color: c.ink2, fontSize: 12 },
  caption: { color: c.ink2, fontSize: 13, textAlign: "center", marginTop: space(6) },
  emptyTitle: { color: c.ink, fontSize: 15, fontWeight: "700" },
  emptySub: { color: c.ink2, fontSize: 13, marginTop: space(1) },
});
