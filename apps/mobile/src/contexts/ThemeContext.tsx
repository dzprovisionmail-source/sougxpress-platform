import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKENS } from "../constants/tokens";
import { getThemeColors, DEFAULT_THEME, ThemeType } from "../constants/theme";

const THEME_STORAGE_KEY = "sougxpress.theme";

type ThemeColors = ReturnType<typeof getThemeColors>;

interface ThemeContextValue {
  theme: ThemeType;
  colors: ThemeColors;
  tokens: typeof TOKENS;
  setTheme: (theme: ThemeType) => void;
  isRTL: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(DEFAULT_THEME);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (mounted && (stored === "dark" || stored === "light" || stored === "ivory")) {
          setThemeState(stored);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback((next: ThemeType) => {
    setThemeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
  }, []);

  const value: ThemeContextValue = {
    theme,
    colors: getThemeColors(theme),
    tokens: TOKENS,
    setTheme,
    isRTL: I18nManager.isRTL,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return ctx;
};

export type { ThemeType };
