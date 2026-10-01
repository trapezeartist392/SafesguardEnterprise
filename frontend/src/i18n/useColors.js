/**
 * useColors.js
 * SafeguardIQ Enterprise — Drop-in replacement for hardcoded T = {...} color objects
 * Place in: frontend/src/i18n/useColors.js
 *
 * USAGE — replace the hardcoded T object in ANY component with:
 *
 *   import { useColors } from '../i18n/useColors';
 *   const T = useColors();
 *
 * That's it. The component will now respond to theme changes.
 */
import { useTheme } from './ThemeContext';
import { DARK } from './ThemeContext';

export function useColors() {
  const themeCtx = useTheme();
  const colors = themeCtx?.colors || DARK;
  return {
    // Backgrounds
    bg:       colors.bg,
    bg2:      colors.bg2,
    card:     colors.card,
    card2:    colors.card2,
    bgSide:   colors.bgSide,
    bgHeader: colors.bgHeader,
    bgCard:   colors.bgCard   || colors.card,

    // Borders
    border:   colors.border,
    borderAlt:colors.borderAlt || colors.border,

    // Text
    text:     colors.text,
    textSub:  colors.textSub  || colors.g1,
    textMute: colors.textMute || colors.g2,
    white:    colors.white    || colors.text,
    g1:       colors.g1       || colors.textSub,
    g2:       colors.g2       || colors.textMute,

    // Brand (same in both themes)
    orange:   colors.orange,
    orng2:    colors.orng2    || '#FF8C52',
    teal:     colors.teal,
    blue:     colors.blue,
    green:    colors.green,
    red:      colors.red,
    amber:    colors.amber,
    accent:   colors.blue,

    // Aliases used in safety-monitor.jsx
    bgCard_sm: colors.bgCard  || colors.card,
  };
}

export default useColors;
