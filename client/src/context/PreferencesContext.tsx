import React, { createContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "claro" | "oscuro";
export type NotificationPreference = "on" | "off";

export type PreferencesContextValue = {
  theme: ThemePreference;
  notifications: NotificationPreference;
  setTheme: (value: ThemePreference) => void;
  setNotifications: (value: NotificationPreference) => void;
};

const THEME_KEY = "cfuturo_theme";
const THEME_EXPLICIT_KEY = "cfuturo_theme_explicit";
const NOTIF_KEY = "cfuturo_notifs";

function normalizeStoredTheme(value: string | null): ThemePreference | null {
  return value === "oscuro" || value === "claro" ? value : null;
}

function getSystemTheme(): ThemePreference {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "oscuro" : "claro";
}

function getStoredThemePreference(): { theme: ThemePreference; followsSystem: boolean } {
  const storedTheme = normalizeStoredTheme(localStorage.getItem(THEME_KEY));
  const hasExplicitTheme = localStorage.getItem(THEME_EXPLICIT_KEY) === "1" || storedTheme === "oscuro";

  if (hasExplicitTheme && storedTheme) {
    return { theme: storedTheme, followsSystem: false };
  }

  return { theme: getSystemTheme(), followsSystem: true };
}

function normalizeNotifs(value: string | null): NotificationPreference {
  return value === "off" ? "off" : "on";
}

// eslint-disable-next-line react-refresh/only-export-components
export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => getStoredThemePreference().theme);
  const [followsSystemTheme, setFollowsSystemTheme] = useState(
    () => getStoredThemePreference().followsSystem
  );
  const [notifications, setNotifications] = useState<NotificationPreference>(() =>
    normalizeNotifs(localStorage.getItem(NOTIF_KEY))
  );

  useEffect(() => {
    if (!followsSystemTheme) {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(THEME_EXPLICIT_KEY, "1");
    }
  }, [followsSystemTheme, theme]);
  useEffect(() => localStorage.setItem(NOTIF_KEY, notifications), [notifications]);

  useEffect(() => {
    if (!followsSystemTheme) return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const syncSystemTheme = () => setThemeState(media.matches ? "oscuro" : "claro");
    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);

    return () => media.removeEventListener("change", syncSystemTheme);
  }, [followsSystemTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "oscuro";
    root.classList.toggle("dark", isDark);
    root.dataset.theme = isDark ? "dark" : "light";
    root.style.colorScheme = isDark ? "dark" : "only light";
  }, [theme]);

  const setTheme = (value: ThemePreference) => {
    setFollowsSystemTheme(false);
    setThemeState(value);
  };

  const value: PreferencesContextValue = useMemo(
    () => ({ theme, notifications, setTheme, setNotifications }),
    [theme, notifications]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
