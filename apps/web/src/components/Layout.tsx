import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, WifiOff, X } from 'lucide-react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { GameRouteCoordinator } from './GameRouteCoordinator';
import { useUserStore } from '../store/useUserStore';
import { useRoomStore } from '../store/useRoomStore';
import { heartbeat } from '../services/api';

export const Layout: React.FC = () => {
  const { isDark, accentColor, language, token } = useUserStore();
  const { error, clearError, connectionState, voiceError } = useRoomStore();
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // Synchronize DOM dark mode, theme variable, and language preference
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.setProperty('--theme-primary', accentColor);
  }, [isDark, accentColor]);

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Heartbeat every 25s when authenticated
  useEffect(() => {
    if (!token) return;
    heartbeat().catch(() => {});
    const interval = setInterval(() => {
      heartbeat().catch(() => {});
    }, 25000);
    return () => clearInterval(interval);
  }, [token]);

  // Only active in-game drawing/guesser pages need the fixed non-scrolling touch canvas container
  const isGameCanvasSession =
    location.pathname === '/game/drawer' ||
    location.pathname === '/game/guesser' ||
    location.pathname === '/game/fullscreen';

  const alerts = (
    <>
      {connectionState === 'reconnecting' && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-amber-950 px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t('common.reconnecting', '网络连接中断，正在自动重连中...')}</span>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-rose-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center justify-between gap-3 border border-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {voiceError && (
        <div className="fixed bottom-16 right-4 z-50 max-w-sm bg-slate-900/90 text-amber-300 border border-amber-500/30 px-3.5 py-2 rounded-xl text-[11px] font-bold shadow-xl backdrop-blur-md flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{voiceError}</span>
        </div>
      )}
    </>
  );

  if (isGameCanvasSession) {
    return (
      <GameRouteCoordinator>
        <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-200 touch-none overscroll-none relative">
          {alerts}
          <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
            <Outlet />
          </main>
        </div>
      </GameRouteCoordinator>
    );
  }

  const isRoomWaiting = location.pathname.startsWith('/room/');

  // Result page (/game/result) and normal lobby/profile pages are scrollable
  return (
    <GameRouteCoordinator>
      <div
        className={`min-h-[100dvh] flex flex-col bg-background text-foreground transition-colors duration-200 relative ${
          isRoomWaiting
            ? 'h-[100dvh] max-h-[100dvh] overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        {alerts}
        <div className={isRoomWaiting ? 'hidden md:block' : ''}>
          <Header />
        </div>
        <main
          className={`flex-1 flex flex-col min-h-0 ${
            isRoomWaiting ? 'pb-0 h-full overflow-hidden' : 'pb-20 md:pb-8'
          }`}
        >
          <Outlet />
        </main>
        {!isRoomWaiting && <MobileNav />}
      </div>
    </GameRouteCoordinator>
  );
};
