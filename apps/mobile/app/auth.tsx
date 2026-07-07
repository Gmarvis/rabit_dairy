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
import { resendConfirmation, signIn, signUp } from "../src/lib/auth";
import { googleAvailable, signInWithGoogle } from "../src/lib/google";
import { colors, radius, space } from "../src/theme/tokens";

/** Turn Supabase's terse auth errors into something a person can act on. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) return "Your email isn't confirmed yet. Check your inbox — or resend the link below.";
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("already registered")) return "That email already has an account — sign in instead.";
  if (m.includes("password")) return "Password must be at least 6 characters.";
  return message;
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    setShowResend(false);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        // On success the auth listener flips the gate and routes to Home.
      } else {
        const { confirmed } = await signUp(email.trim(), password);
        if (!confirmed) {
          setInfo("Account created! Check your email for a confirmation link, then come back and sign in.");
          setShowResend(true);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(friendly(msg));
      if (msg.toLowerCase().includes("email not confirmed")) setShowResend(true);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await resendConfirmation(email.trim());
      setInfo("Confirmation email sent again — check your inbox.");
    } catch {
      setError("Couldn't resend right now.");
    }
  }

  async function google() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? friendly(e.message) : "Google sign-in failed.");
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
      {info ? <Text style={styles.info}>{info}</Text> : null}
      {showResend ? (
        <Pressable onPress={resend} style={{ marginBottom: space(2) }}>
          <Text style={styles.resend}>Resend confirmation email</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.goldInk} />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Text>
        )}
      </Pressable>

      {googleAvailable ? (
        <>
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>or</Text>
            <View style={styles.line} />
          </View>
          <Pressable style={styles.google} onPress={google} disabled={busy}>
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>
        </>
      ) : null}

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
  info: { color: colors.ink2, fontSize: 12, lineHeight: 17, marginBottom: space(2) },
  resend: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", gap: space(3), marginTop: space(4) },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { color: colors.muted, fontSize: 11 },
  google: { marginTop: space(4), borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: space(3.5), alignItems: "center", backgroundColor: colors.card },
  googleText: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  button: {
    backgroundColor: colors.gold, borderRadius: radius.md, padding: space(3.5),
    alignItems: "center", marginTop: space(2),
  },
  buttonText: { color: colors.goldInk, fontWeight: "800", fontSize: 15 },
  switch: { color: colors.gold, fontSize: 13, textAlign: "center", fontWeight: "600" },
});
