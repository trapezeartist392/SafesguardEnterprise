/**
 * ThemeContext.jsx
 * SafeguardIQ Enterprise — Dark/Light Theme Context
 * Place in: frontend/src/i18n/ThemeContext.jsx
 */
import { createContext, useContext, useState, useEffect } from 'react';

export const DARK = {
  // Backgrounds
  bg:       "#05080F",
  bg2:      "#080D18",
  card:     "#0C1422",
  card2:    "#101828",
  bgSide:   "#12171f",
  bgHeader: "#0b0f16",
  bgCard:   "#161b24",

  // Borders
  border:   "#1A2540",
  borderAlt:"rgba(255,255,255,0.08)",

  // Text
  text:     "#EDF2FF",
  textSub:  "#8899BB",
  textMute: "#4e596b",
  white:    "#EDF2FF",
  g1:       "#8899BB",
  g2:       "#3A4E72",

  // Brand colors (same in both themes)
  orange:   "#FF5B18",
  orng2:    "#FF8C52",
  teal:     "#00D4B4",
  blue:     "#2D8EFF",
  green:    "#22D468",
  red:      "#FF3D3D",
  amber:    "#FFB400",

  // Mode
  mode: "dark",
};

export const LIGHT = {
  // Backgrounds
  bg:       "#F0F4F8",
  bg2:      "#E8EEF5",
  card:     "#FFFFFF",
  card2:    "#F5F7FA",
  bgSide:   "#EDF2F7",
  bgHeader: "#FFFFFF",
  bgCard:   "#FFFFFF",

  // Borders
  border:   "#D0D7E3",
  borderAlt:"rgba(0,0,0,0.08)",

  // Text
  text:     "#0F1A2E",
  textSub:  "#4A5568",
  textMute: "#A0AEC0",
  white:    "#0F1A2E",
  g1:       "#4A5568",
  g2:       "#A0AEC0",

  // Brand colors (same in both themes)
  orange:   "#FF5B18",
  orng2:    "#FF8C52",
  teal:     "#00A693",
  blue:     "#2563EB",
  green:    "#16A34A",
  red:      "#DC2626",
  amber:    "#D97706",

  // Mode
  mode: "light",
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('safeg_theme') || 'dark'
  );

  const colors = theme === 'dark' ? DARK : LIGHT;

  useEffect(() => {
    localStorage.setItem('safeg_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.background = colors.bg;
    document.body.style.color      = colors.text;
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
