import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gamepad2, Sparkles, Trophy } from 'lucide-react';
import { ThemeToggle, Avatar } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme, accentColor, setAccentColor, language, setLanguage, nickname, avatar } =
    useUserStore();

  const handleToggleLang = () => {
    const next = language === 'zh-CN' ? 'en' : 'zh-CN';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-background/80 border-b border-border/80 px-4 sm:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-[var(--theme-primary,#5B5BF0)] text-white flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-foreground group-hover:text-[var(--theme-primary,#5B5BF0)] transition-colors">
                PlayHub
              </span>
              <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--theme-primary,#5B5BF0)]/15 text-[var(--theme-primary,#5B5BF0)]">
                Idavoll
              </span>
            </div>
            <p className="hidden md:block text-[11px] font-medium text-muted-foreground">
              {t('appSubtitle')}
            </p>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-full border border-border/60">
          <Link
            to="/lobby"
            className="px-4 py-1.5 rounded-full text-sm font-bold text-foreground hover:bg-background/80 transition-all"
          >
            大厅
          </Link>
          <Link
            to="/games"
            className="px-4 py-1.5 rounded-full text-sm font-bold text-foreground hover:bg-background/80 transition-all"
          >
            游戏库
          </Link>
          <Link
            to="/room/room_idavoll_demo"
            className="px-4 py-1.5 rounded-full text-sm font-bold text-foreground hover:bg-background/80 transition-all"
          >
            当前房间
          </Link>
          <Link
            to="/profile"
            className="px-4 py-1.5 rounded-full text-sm font-bold text-foreground hover:bg-background/80 transition-all"
          >
            个人中心
          </Link>
        </nav>

        {/* Right Tools & User Profile */}
        <div className="flex items-center gap-3">
          {/* Theme & Language Switcher */}
          <ThemeToggle
            isDark={isDark}
            onToggleTheme={toggleTheme}
            currentAccent={accentColor}
            onSelectAccent={setAccentColor}
            currentLang={language}
            onToggleLang={handleToggleLang}
          />

          {/* User Profile Pill */}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 p-1 pl-2 pr-3 rounded-full bg-muted/60 hover:bg-muted border border-border/80 transition-colors cursor-pointer"
          >
            <Avatar src={avatar} alt={nickname} size="sm" status="online" />
            <span className="text-xs font-bold text-foreground hidden sm:inline max-w-[80px] truncate">
              {nickname}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
