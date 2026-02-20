"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type ReadReadyTheme = "light" | "dark" | "warm" | "night";

const THEME_STORAGE_KEY = "readready-theme";

type ThemeContextValue = {
  theme: ReadReadyTheme;
  setTheme: (theme: ReadReadyTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: ReadReadyTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function isTheme(value: string): value is ReadReadyTheme {
  return value === "light" || value === "dark" || value === "warm" || value === "night";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  // Initialize from localStorage on first client render; fall back to "light"
  // for SSR (where window is undefined). Lazy initializer avoids calling
  // setState inside a useEffect, which triggers react-hooks/set-state-in-effect.
  const [theme, setThemeState] = useState<ReadReadyTheme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && isTheme(saved) ? saved : "light";
  });

  // Sync the data-theme attribute to the DOM whenever theme changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (nextTheme: ReadReadyTheme): void => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
