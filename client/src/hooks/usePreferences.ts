import { useContext } from "react";
import { PreferencesContext } from "../context/PreferencesContext";

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences debe usarse dentro de PreferencesProvider");
  return ctx;
}

