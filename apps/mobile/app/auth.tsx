import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signIn, signUp } from "../src/lib/auth";
import { colors, radius, space } from "../src/theme/tokens";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      // On success the auth listener flips the gate and routes to Home.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space(10) }]}>
      <View style={styles.logo}>
        <Text style={{ fontSize: 22 }}>🐇</Text>
      </View>
      <Text style={styles.title}>
        {mode === "signin" ? "Welcome back" : "Create your diary"}
      </Text>
      <Text style={styles.sub}>
        {mode === "signin" ? "Sign in to your diary" : "Start tracking in seconds"}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.goldInk} />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          setError(null);
          setMode((m) => (m === "signin" ? "signup" : "signin"));
        }}
        style={{ marginTop: space(4) }}
      >
        <Text style={styles.switch}>
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: space(6) },
  logo: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.card2,
    alignItems: "center", justifyContent: "center", marginBottom: space(5),
  },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  sub: { color: colors.ink2, fontSize: 13, marginTop: 4, marginBottom: space(5) },
  field: { marginBottom: space(3) },
  label: {
    color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8,
    textTransform: "uppercase", marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: space(3.5), paddingVertical: space(3),
    color: colors.ink, fontSize: 15,
  },
  error: { color: colors.negative, fontSize: 12, marginBottom: space(2) },
  button: {
    backgroundColor: colors.gold, borderRadius: radius.md, padding: space(3.5),
    alignItems: "center", marginTop: space(2),
  },
  buttonText: { color: colors.goldInk, fontWeight: "800", fontSize: 15 },
  switch: { color: colors.gold, fontSize: 13, textAlign: "center", fontWeight: "600" },
});
