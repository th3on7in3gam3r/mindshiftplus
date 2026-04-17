import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("msw_theme") === "dark"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("msw_theme", dark ? "dark" : "light"); } catch {}
    // Apply to root for any global CSS that needs it
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ── Theme token sets ───────────────────────────────────────────────────────────
export const LIGHT = {
  // Backgrounds
  bg:       "#f4f6fb",
  surface:  "#ffffff",
  card:     "#ffffff",
  card2:    "#f8faff",
  sidebar:  "#1e2d5a",
  sidebarActive: "#2d4a8a",
  // Borders
  border:   "#e2e8f0",
  border2:  "#cbd5e1",
  // Brand
  accent:   "#3b5bdb",
  accent2:  "#4a6cf7",
  teal:     "#0ea5a0",
  rose:     "#e05c7a",
  gold:     "#f0a500",
  green:    "#16a34a",
  purple:   "#7c3aed",
  // Text
  text:     "#0f172a",
  text2:    "#1e293b",
  muted:    "#64748b",
  muted2:   "#94a3b8",
  // Gradient
  grad:     "linear-gradient(135deg, #3b5bdb, #0ea5a0)",
  gradSoft: "linear-gradient(135deg, #3b5bdb18, #0ea5a018)",
  // Shadow
  shadow:   "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(59,91,219,0.06)",
  shadowMd: "0 4px 20px rgba(59,91,219,0.12)",
};

export const DARK = {
  bg:       "#080c18",
  surface:  "#0d1225",
  card:     "rgba(255,255,255,0.03)",
  card2:    "rgba(255,255,255,0.06)",
  sidebar:  "#0d1225",
  sidebarActive: "rgba(124,111,247,0.2)",
  border:   "rgba(255,255,255,0.08)",
  border2:  "rgba(255,255,255,0.14)",
  accent:   "#7c6ff7",
  accent2:  "#a89cf5",
  teal:     "#4ecdc4",
  rose:     "#f093a0",
  gold:     "#f5c842",
  green:    "#4ade80",
  purple:   "#a89cf5",
  text:     "#eef0ff",
  text2:    "#c8d0f0",
  muted:    "#94a3b8",
  muted2:   "#5a6a85",
  grad:     "linear-gradient(135deg, #7c6ff7, #4ecdc4)",
  gradSoft: "linear-gradient(135deg, rgba(124,111,247,0.15), rgba(78,205,196,0.08))",
  shadow:   "0 2px 12px rgba(0,0,0,0.4)",
  shadowMd: "0 4px 24px rgba(0,0,0,0.5)",
};

export function useTokens() {
  const { dark } = useTheme();
  return dark ? DARK : LIGHT;
}

// ── ThemeToggle button ─────────────────────────────────────────────────────────
export function ThemeToggle({ style = {} }) {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: dark ? "rgba(255,255,255,0.07)" : "rgba(59,91,219,0.08)",
      border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(59,91,219,0.15)",
      borderRadius: 20, padding: "6px 12px",
      cursor: "pointer", fontFamily: "inherit",
      fontSize: 12, fontWeight: 600,
      color: dark ? "#a89cf5" : "#3b5bdb",
      transition: "all .2s",
      ...style,
    }}>
      <span style={{ fontSize: 14 }}>{dark ? "☀️" : "🌙"}</span>
      {dark ? "Light" : "Dark"}
    </button>
  );
}
