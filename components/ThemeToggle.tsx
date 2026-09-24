'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/**
 * Sağ üst köşe tema geçiş butonu (Güneş/Ay).
 * Seçim ThemeProvider üzerinden localStorage'a yazılır (bimay_fx_theme).
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-500/60 text-[11px] font-bold transition-colors shadow-sm select-none"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-400" />
      )}
      <span>{isDark ? 'Açık Tema' : 'Koyu Tema'}</span>
    </button>
  );
}
