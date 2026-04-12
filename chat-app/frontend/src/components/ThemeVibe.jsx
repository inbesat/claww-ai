import React from 'react';

const themes = [
  { id: 'cyberpunk', name: 'Cyberpunk', colors: ['#a855f7', '#ec4899'] },
  { id: 'forest', name: 'Forest', colors: ['#10b981', '#34d399'] },
  { id: 'minimal', name: 'Minimal', colors: ['#64748b', '#94a3b8'] },
  { id: 'matrix', name: 'Matrix', colors: ['#00FF41', '#39FF14'] },
  { id: 'vaporwave', name: 'Vaporwave', colors: ['#FF71CE', '#01CDFE'] },
  { id: 'nord', name: 'Nord', colors: ['#88C0D0', '#5E81AC'] },
  { id: 'bloodmoon', name: 'Blood Moon', colors: ['#FF0000', '#8B0000'] },
];

function ThemeVibe({ currentTheme, onThemeChange }) {
  const handleThemeChange = (themeId) => {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('theme', themeId);
    onThemeChange?.(themeId);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--theme-text-muted)] uppercase tracking-wider">Theme</span>
      <div className="flex gap-1">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`w-6 h-6 rounded-full transition-all duration-200 ${
              currentTheme === theme.id 
                ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--theme-bg)] scale-110' 
                : 'opacity-60 hover:opacity-100 scale-95 hover:scale-100'
            }`}
            style={{
              background: `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 100%)`,
            }}
            title={theme.name}
          />
        ))}
      </div>
    </div>
  );
}

export default ThemeVibe;