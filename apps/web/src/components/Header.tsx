import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gamepad2 } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { ThemeToggle, Avatar } from '@idavoll/ui';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme, accentColor, setAccentColor, language, setLanguage, nickname, avatar } =
    useUserStore();
  const room = useRoomStore((s) => s.room);

  const handleToggleLang = () => {
    const next = language === 'zh-CN' ? 'en' : 'zh-CN';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  const navItems = [
    {
      id: 'lobby',
      path: '/lobby',
      label: t('nav.lobby', '大厅'),
      isActive: location.pathname === '/' || location.pathname === '/lobby',
    },
    {
      id: 'games',
      path: '/games',
      label: t('nav.games', '游戏库'),
      isActive: location.pathname.startsWith('/games'),
    },
    {
      id: 'room',
      path: room ? `/room/${room.roomId}` : '/create-room',
      label: room ? t('nav.currentRoom', '当前房间') : t('nav.createRoom', '创建房间'),
      isActive: location.pathname === '/create-room' || location.pathname.startsWith('/room/'),
    },
    {
      id: 'profile',
      path: '/profile',
      label: t('nav.profile', '个人中心'),
      isActive: location.pathname.startsWith('/profile'),
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-background/80 border-b border-border/80 px-4 sm:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-[var(--theme-primary,#5B5BF0)] text-white flex items-center justify-center shadow-md shadow-[var(--theme-primary,#5B5BF0)]/25 group-hover:scale-105 transition-transform">
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
        <LayoutGroup id="header-nav">
          <nav
            className="hidden md:flex items-center gap-1 bg-muted/60 p-1.5 rounded-full border border-border/80 shadow-inner relative isolate"
            role="navigation"
            aria-label="Main Navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                aria-current={item.isActive ? 'page' : undefined}
                className={`relative px-4 sm:px-5 py-2 rounded-full text-sm select-none transition-colors duration-200 flex items-center justify-center cursor-pointer ${
                  item.isActive
                    ? 'text-white font-extrabold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40 font-bold'
                }`}
              >
                {item.isActive && (
                  <motion.div
                    layoutId="header-nav-indicator"
                    className="absolute inset-0 rounded-full bg-[var(--theme-primary,#5B5BF0)] shadow-md shadow-[var(--theme-primary,#5B5BF0)]/25"
                    style={{ backgroundColor: 'var(--theme-primary, #5B5BF0)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  />
                )}
                <span className="relative z-10 pointer-events-none">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        </LayoutGroup>

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
