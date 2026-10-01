/**
 * LanguageToggle.jsx
 * SafeguardIQ Enterprise — Hindi/English Toggle Button
 * Place in: frontend/src/components/LanguageToggle.jsx
 * Use anywhere in the app: <LanguageToggle />
 */
import { useLang } from '../i18n/LanguageContext';

export default function LanguageToggle({ style = {} }) {
  const { lang, toggleLang } = useLang();

  return (
    <button
      onClick={toggleLang}
      title={lang === 'en' ? 'Switch to Hindi' : 'Switch to English'}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            6,
        background:     lang === 'hi' ? "rgba(255,91,24,0.15)" : "rgba(255,255,255,0.06)",
        border:         lang === 'hi' ? "1px solid rgba(255,91,24,0.4)" : "1px solid rgba(255,255,255,0.12)",
        borderRadius:   20,
        padding:        "5px 14px",
        cursor:         "pointer",
        fontFamily:     "'Nunito', sans-serif",
        fontSize:       12,
        fontWeight:     700,
        color:          lang === 'hi' ? "#FF5B18" : "#8899BB",
        transition:     "all .2s",
        letterSpacing:  0.5,
        ...style,
      }}
    >
      <span style={{ fontSize: 16 }}>
        {lang === 'en' ? '🇮🇳' : '🇬🇧'}
      </span>
      <span>
        {lang === 'en' ? 'हिंदी' : 'English'}
      </span>
    </button>
  );
}
