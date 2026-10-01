/**
 * LanguageContext.jsx
 * SafeguardIQ Enterprise — Global Language Context
 * Place in: frontend/src/i18n/LanguageContext.jsx
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() =>
    localStorage.getItem('safeg_lang') || 'en'
  );

  useEffect(() => {
    localStorage.setItem('safeg_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;

  const toggleLang = () => setLang(l => l === 'en' ? 'hi' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
export default LanguageContext;
