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
  const [theme, setThemeState] = useState<ReadReadyTheme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme && isTheme(savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
      return;
    }

    applyTheme("light");
  }, []);

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
