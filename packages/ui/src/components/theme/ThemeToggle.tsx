import React from 'react';
import { Sun, Moon, Palette, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccentPresets } from '../../tokens';
import { Button } from '../ui/button';

export interface ThemeToggleProps {
  isDark: boolean;
  onToggleTheme: () => void;
  currentAccent: string;
  onSelectAccent: (colorHex: string) => void;
  currentLang: string;
  onToggleLang: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  isDark,
  onToggleTheme,
  currentAccent,
  onSelectAccent,
  currentLang,
  onToggleLang,
}) => {
  return (
    <div className="flex items-center gap-2 p-1.5 bg-card/80 backdrop-blur-md rounded-full border border-border shadow-sm">
      {/* Dark / Light Toggle */}
      <button
        type="button"
        onClick={onToggleTheme}
        className="w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
        title={isDark ? (currentLang === 'zh-CN' ? '切换亮色模式' : 'Switch to Light Mode') : (currentLang === 'zh-CN' ? '切换暗色模式' : 'Switch to Dark Mode')}
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[var(--theme-primary,#5B5BF0)]" />}
      </button>

      {/* Language Toggle */}
      <button
        type="button"
        onClick={onToggleLang}
        className="px-2.5 h-8 rounded-full flex items-center gap-1 text-xs font-black text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
        title={currentLang === 'zh-CN' ? '切换语言 (ZH / EN)' : 'Switch Language (ZH / EN)'}
      >
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{currentLang === 'zh-CN' ? '中文' : 'EN'}</span>
      </button>

      {/* Accent Colors */}
      <div className="flex items-center gap-1 pl-1 border-l border-border/80">
        {AccentPresets.map((preset) => {
          const isSelected = currentAccent.toLowerCase() === preset.hex.toLowerCase();
          return (
            <motion.button
              key={preset.id}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => onSelectAccent(preset.hex)}
              className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                isSelected ? 'border-white scale-110 ring-2 ring-[var(--theme-primary,#5B5BF0)] shadow-sm' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
            />
          );
        })}
      </div>
    </div>
  );
};
