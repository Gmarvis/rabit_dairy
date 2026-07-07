/**
 * Theme context. The app ships light and dark grounds; by default it follows
 * the phone's appearance, and the Settings screen can pin it to Light or Dark.
 * The choice persists across launches.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkPalette, lightPalette, type Palette } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  /** The active palette. */
  c: Palette;
  /** True when the resolved theme is dark. */
  isDark: boolean;
  /** The user's preference (may be "system"). */
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "rabbit.themeMode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Restore the saved preference once on mount.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (alive && (v === "light" || v === "dark" || v === "system")) setModeState(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = mode === "system" ? (system ?? "dark") : mode;
    const isDark = resolved === "dark";
    return { c: isDark ? darkPalette : lightPalette, isDark, mode, setMode };
  }, [mode, system]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within a ThemeProvider");
  return v;
}
