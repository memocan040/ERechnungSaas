'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MobileSidebar } from './sidebar';
import { Bell, Search, Sun, Moon } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import { useState, useEffect } from 'react';

export function Header() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:px-6 transition-all duration-200">
      <MobileSidebar />

      <div className="flex flex-1 items-center gap-4">
        {/* Search Bar */}
        <div className="hidden md:flex md:flex-1">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="search"
              placeholder="Suchen Sie nach Rechnungen, Kunden..."
              className="h-10 w-full rounded-xl border border-input/50 bg-muted/30 px-10 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 focus-visible:bg-background hover:bg-muted/50"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden h-6 select-none items-center gap-1 rounded-md border border-border/50 bg-muted/50 px-2 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 lg:gap-3">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl"
            onClick={toggleDarkMode}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Dunkelmodus umschalten</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative rounded-xl group">
            <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-[10px] font-bold text-white shadow-lg shadow-red-500/30 animate-pulse">
              3
            </span>
            <span className="sr-only">Benachrichtigungen</span>
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border/50">
            <div className="hidden text-right text-sm md:block">
              <p className="font-semibold text-foreground">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
            <div className="relative group cursor-pointer">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-200 group-hover:ring-primary/40">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
