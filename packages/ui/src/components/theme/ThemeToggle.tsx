import React from 'react';
import { Sun, Moon, Globe, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { AccentPresets } from '../../tokens';

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
    <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-card/80 backdrop-blur-md rounded-full border border-border shadow-xs shrink-0 max-w-full">
      {/* Dark / Light Toggle */}
      <button
        type="button"
        onClick={onToggleTheme}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
        title={isDark ? (currentLang === 'zh-CN' ? '切换亮色模式' : 'Switch to Light Mode') : (currentLang === 'zh-CN' ? '切换暗色模式' : 'Switch to Dark Mode')}
      >
        {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--theme-primary,#5B5BF0)]" />}
      </button>

      {/* Language Toggle */}
      <button
        type="button"
        onClick={onToggleLang}
        className="px-1.5 sm:px-2.5 h-7 sm:h-8 rounded-full flex items-center gap-1 text-[11px] sm:text-xs font-black text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
        title={currentLang === 'zh-CN' ? '切换语言 (ZH / EN)' : 'Switch Language (ZH / EN)'}
      >
        <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
        <span>{currentLang === 'zh-CN' ? '中文' : 'EN'}</span>
      </button>

      {/* Mobile: Accent Color Dropdown Select (md:hidden) */}
      <div className="md:hidden relative flex items-center pl-1 border-l border-border/80">
        <span
          className="w-3 h-3 rounded-full border border-white/90 shadow-xs pointer-events-none absolute left-2 shrink-0 z-10"
          style={{ backgroundColor: currentAccent }}
          aria-hidden="true"
        />
        <select
          value={currentAccent.toUpperCase()}
          onChange={(e) => onSelectAccent(e.target.value)}
          className="appearance-none pl-6 pr-5 py-0.5 h-7 text-[11px] font-extrabold bg-muted/70 hover:bg-muted text-foreground rounded-full border border-border/70 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[var(--theme-primary,#5B5BF0)] max-w-[76px] truncate"
          title={currentLang === 'zh-CN' ? '选择主题色' : 'Select Accent Color'}
          aria-label={currentLang === 'zh-CN' ? '选择主题色' : 'Select Accent Color'}
        >
          {AccentPresets.map((preset) => (
            <option
              key={preset.id}
              value={preset.hex.toUpperCase()}
              className="bg-card text-foreground font-bold text-xs"
            >
              {currentLang === 'zh-CN' ? preset.name.split(' ')[0] : preset.id.charAt(0).toUpperCase() + preset.id.slice(1)}
            </option>
          ))}
        </select>
        <ChevronDown className="w-2.5 h-2.5 text-muted-foreground absolute right-1.5 pointer-events-none shrink-0" />
      </div>

      {/* Desktop: Accent Color Circles (hidden md:flex) */}
      <div className="hidden md:flex items-center gap-1 pl-1 border-l border-border/80">
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
