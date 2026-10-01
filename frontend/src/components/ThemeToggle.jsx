import { useState, useEffect } from 'react';

export default function ThemeToggle({ style = {} }) {
  const [isDark, setIsDark] = useState(() =>
    localStorage.getItem('safeg_theme') !== 'light'
  );

  useEffect(() => {
    const root = document.getElementById('root');
    if (!isDark) {
      root.style.filter = 'invert(1) hue-rotate(180deg)';
      root.style.background = '#F0F4F8';
      // Force grey text to be dark in light mode
      const style = document.getElementById('safeg-light-style') || document.createElement('style');
      style.id = 'safeg-light-style';
      style.textContent = `
        #root input,
        #root select,
        #root textarea {
          filter: invert(1) hue-rotate(180deg) !important;
          background: #ffffff !important;
          color: #0F1A2E !important;
          border-color: #D0D7E3 !important;
        }
        #root input::placeholder,
        #root textarea::placeholder {
          color: #A0AEC0 !important;
        }
        #root [style*="color: rgb(136, 153, 187)"],
        #root [style*="color:#8899BB"],
        #root [style*="color: #8899BB"] {
          filter: invert(1) !important;
        }
        #root [style*="color: rgb(58, 78, 114)"],
        #root [style*="color:#3A4E72"],
        #root [style*="color: #3A4E72"] {
          filter: invert(1) !important;
        }
        #root [style*="color: rgb(78, 89, 107)"],
        #root [style*="color:#4e596b"],
        #root [style*="color: #4e596b"] {
          filter: invert(1) !important;
        }
      `;
      document.head.appendChild(style);
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      root.style.filter = '';
      root.style.background = '';
      const style = document.getElementById('safeg-light-style');
      if (style) style.remove();
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('safeg_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(d => !d)}
      style={{
        display:"flex", alignItems:"center", gap:6,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.15)",
        borderRadius:20, padding:"5px 14px", cursor:"pointer",
        fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700,
        color: isDark ? "#8899BB" : "#4A5568",
        transition:"all .2s", ...style,
      }}
    >
      <span style={{ fontSize:16 }}>{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}