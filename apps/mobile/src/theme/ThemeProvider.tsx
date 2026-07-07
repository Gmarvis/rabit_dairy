import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type Theme } from "./tokens";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  /** The user's preference. */
  mode: ThemeMode;
  /** Resolved light/dark actually in effect. */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  mode: "system",
  resolved: "dark",
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const value = useMemo<ThemeContextValue>(() => {
    const resolved: "light" | "dark" =
      mode === "system" ? (system === "light" ? "light" : "dark") : mode;
    return {
      theme: resolved === "light" ? lightTheme : darkTheme,
      mode,
      resolved,
      setMode,
    };
  }, [mode, system]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Access the active theme + palette. */
export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

/** Access the full theme controls (for a settings toggle). */
export function useThemeControls(): ThemeContextValue {
  return useContext(ThemeContext);
}
