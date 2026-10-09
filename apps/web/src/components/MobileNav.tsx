import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Gamepad2, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../store/useRoomStore';

export const MobileNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const room = useRoomStore((s) => s.room);

  const navItems = [
    { path: '/lobby', label: t('nav.lobby', '大厅'), icon: LayoutGrid },
    { path: '/games', label: t('nav.games', '游戏库'), icon: Gamepad2 },
    { path: room ? `/room/${room.roomId}` : '/create-room', label: room ? t('nav.room', '房间') : t('nav.create', '建房'), icon: Users },
    { path: '/profile', label: t('nav.profileShort', '我的'), icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border px-4 py-2 pb-safe">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/' || location.pathname === '/lobby'
              : location.pathname.startsWith(item.path);

          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 py-1 px-3 relative cursor-pointer"
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  isActive ? 'text-[var(--theme-primary,#5B5BF0)] bg-[var(--theme-primary,#5B5BF0)]/10' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight ${
                  isActive ? 'text-[var(--theme-primary,#5B5BF0)] font-extrabold' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--theme-primary,#5B5BF0)]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
