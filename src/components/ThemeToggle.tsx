import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all hover:scale-110"
      style={{
        background: 'var(--paper-warm)',
        border: '1px solid var(--border)',
      }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
      ) : (
        <Sun className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      )}
    </button>
  );
}
