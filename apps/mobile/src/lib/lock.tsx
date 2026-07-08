import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { radius, space, type Palette } from "../theme/tokens";

export const BIOMETRIC_KEY = "rabbit.biometricLock";

// expo-local-authentication is a NATIVE module — load it defensively so an app
// without the module built in never gets permanently locked out.
const LocalAuth = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-local-authentication") as typeof import("expo-local-authentication");
  } catch {
    return null;
  }
})();

export const biometricModuleAvailable = !!LocalAuth;

/** True only if the device actually has biometrics/passcode enrolled. */
export async function canUseBiometrics(): Promise<boolean> {
  if (!LocalAuth) return false;
  try {
    return (await LocalAuth.hasHardwareAsync()) && (await LocalAuth.isEnrolledAsync());
  } catch {
    return false;
  }
}

/**
 * Wraps the app and, when the "Biometric lock" preference is on, blocks the UI
 * behind a Face ID / passcode prompt on cold start and every time the app
 * returns from the background.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const lockedRef = useRef(false);
  const appState = useRef(AppState.currentState);

  const setLockedBoth = (v: boolean) => {
    lockedRef.current = v;
    setLocked(v);
  };

  async function authenticate() {
    if (!LocalAuth) return setLockedBoth(false); // no module → don't trap the user
    setChecking(true);
    try {
      if (!(await canUseBiometrics())) return setLockedBoth(false);
      const res = await LocalAuth.authenticateAsync({
        promptMessage: "Unlock Rabbit Dairy",
        fallbackLabel: "Use passcode",
      });
      if (res.success) setLockedBoth(false);
    } catch {
      /* stay locked; the user can retry */
    } finally {
      setChecking(false);
    }
  }

  // Cold start: lock immediately if the preference is on.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(BIOMETRIC_KEY)
      .then((v) => {
        if (!active) return;
        const on = v === "1";
        setEnabled(on);
        if (on) {
          setLockedBoth(true);
          void authenticate();
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Re-lock on background; re-prompt on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev === "active" && (next === "inactive" || next === "background")) {
        AsyncStorage.getItem(BIOMETRIC_KEY)
          .then((v) => {
            if (v === "1") { setEnabled(true); setLockedBoth(true); }
          })
          .catch(() => {});
      } else if (next === "active" && lockedRef.current) {
        void authenticate();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {enabled && locked ? <LockScreen onUnlock={authenticate} busy={checking} /> : null}
    </View>
  );
}

function LockScreen({ onUnlock, busy }: { onUnlock: () => void; busy: boolean }) {
  const c = useTheme();
  const s = makeStyles(c);
  return (
    <View style={s.overlay}>
      <View style={s.badge}>
        <Ionicons name="lock-closed" size={34} color={c.gold} />
      </View>
      <Text style={s.title}>Rabbit Dairy is locked</Text>
      <Text style={s.sub}>Unlock with Face ID or your passcode to see your finances.</Text>
      <Pressable style={s.button} onPress={onUnlock} disabled={busy} accessibilityRole="button">
        {busy ? (
          <ActivityIndicator color={c.goldInk} />
        ) : (
          <Text style={s.buttonText}>Unlock</Text>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(8),
    gap: space(3),
  },
  badge: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: c.goldSoft,
    alignItems: "center", justifyContent: "center", marginBottom: space(2),
  },
  title: { color: c.ink, fontSize: 20, fontWeight: "800" },
  sub: { color: c.ink2, fontSize: 14, textAlign: "center", lineHeight: 20 },
  button: {
    marginTop: space(3), backgroundColor: c.gold, borderRadius: radius.lg,
    paddingVertical: space(3.5), paddingHorizontal: space(10), alignItems: "center", minWidth: 200,
  },
  buttonText: { color: c.goldInk, fontWeight: "800", fontSize: 16 },
});
