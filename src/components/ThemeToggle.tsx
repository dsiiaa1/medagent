'use client';

/**
 * ThemeToggle — sun/moon button for dark/light mode switch.
 * Animates smoothly between icons.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="theme-toggle"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
    >
      <span
        className="transition-all duration-300"
        style={{
          opacity: 1,
          transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
        }}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </span>
    </button>
  );
}
