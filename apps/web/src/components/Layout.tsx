import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useUserStore } from '../store/useUserStore';

export const Layout: React.FC = () => {
  const { isDark, accentColor } = useUserStore();
  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.setProperty('--theme-primary', accentColor);
  }, [isDark, accentColor]);

  // In-game pages are full-screen immersive games on mobile/desktop without outer headers or tabbars
  const isGameSession = location.pathname.startsWith('/game/');

  if (isGameSession) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-background text-foreground transition-colors duration-200 touch-none overscroll-none">
        <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground transition-colors duration-200">
      <Header />
      <main className="flex-1 pb-20 md:pb-8 flex flex-col">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};
