'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.02] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header />

        <main
          className={cn(
            'flex-1 overflow-y-auto p-6 lg:p-8',
            'transition-all duration-300'
          )}
        >
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
