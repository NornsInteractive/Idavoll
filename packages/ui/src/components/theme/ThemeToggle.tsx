import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Globe, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

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

      {/* Mobile: Accent Color Dropdown Popover (md:hidden) */}
      <div ref={dropdownRef} className="md:hidden relative flex items-center pl-1 border-l border-border/80">
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-2 py-1 h-7 rounded-full bg-muted/60 hover:bg-muted border border-border/80 transition-all cursor-pointer ${
            dropdownOpen ? 'ring-2 ring-[var(--theme-primary,#5B5BF0)]/40 bg-muted' : ''
          }`}
          aria-expanded={dropdownOpen}
          aria-label={currentLang === 'zh-CN' ? '切换主题色' : 'Select Theme Accent'}
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/90 shadow-xs shrink-0"
            style={{ backgroundColor: currentAccent }}
          />
          <motion.span
            animate={{ rotate: dropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </motion.span>
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="absolute top-full right-0 mt-2 p-2 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/90 shadow-xl shadow-black/10 z-50 flex items-center gap-2"
              role="menu"
            >
              {AccentPresets.map((preset) => {
                const isSelected = currentAccent.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    whileTap={{ scale: 0.82 }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => {
                      onSelectAccent(preset.hex);
                      setDropdownOpen(false);
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer relative shrink-0 ${
                      isSelected
                        ? 'border-white scale-110 ring-2 ring-[var(--theme-primary,#5B5BF0)] shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                    aria-label={preset.name}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
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
