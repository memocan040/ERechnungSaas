'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  PlusCircle,
  BarChart3,
  Building2,
  Sparkles,
  BookOpen,
  Wallet,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Rechnungen', href: '/invoices', icon: FileText },
  { title: 'Kunden', href: '/customers', icon: Users },
  { title: 'Berichte', href: '/reports', icon: BarChart3 },
];

const accountingNavItems: NavItem[] = [
  { title: 'Kontenplan', href: '/accounting/accounts', icon: Wallet },
  { title: 'Buchungssätze', href: '/accounting/journal', icon: BookOpen },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Unternehmen', href: '/company', icon: Building2 },
  { title: 'Einstellungen', href: '/settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function NavLink({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-primary to-primary/70" />
      )}
      <Icon className={cn(
        'h-5 w-5 shrink-0 transition-transform duration-200',
        isActive && 'text-primary',
        !isActive && 'group-hover:scale-110'
      )} />
      {!collapsed && (
        <span className="transition-colors duration-200">{item.title}</span>
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden h-screen border-r border-sidebar-border/50 bg-sidebar/80 backdrop-blur-xl transition-all duration-300 lg:flex lg:flex-col',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border/50 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
              <FileText className="h-5 w-5" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">ERechnung</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Pro Suite</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <FileText className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* New Invoice Button */}
        <div className="p-4">
          <Link href="/invoices/new">
            <Button
              className={cn('w-full gap-2', collapsed && 'px-0')}
              size={collapsed ? 'icon' : 'default'}
              variant="default"
            >
              <PlusCircle className="h-4 w-4" />
              {!collapsed && <span>Neue Rechnung</span>}
            </Button>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1">
            <p className={cn(
              "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70",
              collapsed && "sr-only"
            )}>
              Navigation
            </p>
            <nav className="flex flex-col gap-1">
              {mainNavItems.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </nav>
          </div>

          <Separator className="my-4 bg-sidebar-border/50" />

          <div className="space-y-1">
            <p className={cn(
              "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70",
              collapsed && "sr-only"
            )}>
              Buchhaltung
            </p>
            <nav className="flex flex-col gap-1">
              {accountingNavItems.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </nav>
          </div>

          <Separator className="my-4 bg-sidebar-border/50" />

          <div className="space-y-1">
            <p className={cn(
              "px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70",
              collapsed && "sr-only"
            )}>
              Verwaltung
            </p>
            <nav className="flex flex-col gap-1">
              {secondaryNavItems.map((item) => (
                <NavLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </nav>
          </div>
        </ScrollArea>

        {/* Collapse Button */}
        <div className="border-t border-sidebar-border/50 p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full justify-center gap-2', collapsed && 'px-0')}
            onClick={onToggle}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Einklappen</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menü öffnen</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar/95 backdrop-blur-xl">
        <div className="flex h-16 items-center border-b border-sidebar-border/50 px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              <FileText className="h-5 w-5" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">ERechnung</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Pro Suite</span>
            </div>
          </Link>
        </div>

        <div className="p-4">
          <Link href="/invoices/new" onClick={() => setOpen(false)}>
            <Button className="w-full gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Neue Rechnung</span>
            </Button>
          </Link>
        </div>

        <ScrollArea className="h-[calc(100vh-160px)] px-3">
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Navigation
            </p>
            <nav className="flex flex-col gap-1">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={false}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
          </div>

          <Separator className="my-4 bg-sidebar-border/50" />

          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Verwaltung
            </p>
            <nav className="flex flex-col gap-1">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={false}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
