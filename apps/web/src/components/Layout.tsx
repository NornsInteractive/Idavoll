import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useUserStore } from '../store/useUserStore';

export const Layout: React.FC = () => {
  const { isDark, accentColor } = useUserStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.setProperty('--theme-primary', accentColor);
  }, [isDark, accentColor]);

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
