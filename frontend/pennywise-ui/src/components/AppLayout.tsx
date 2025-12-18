import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  Menu,
  Palette,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/expenses', label: 'Expenses', icon: CreditCard },
  { to: '/categories', label: 'Categories', icon: Palette },
  { to: '/networth', label: 'Net Worth', icon: TrendingUp },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-gradient-1 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-gradient-2 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-3 blur-3xl" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 z-50 h-full w-64 border-r border-border/60 bg-background/95 backdrop-blur transition-all duration-200 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} ${
          sidebarOpen ? 'left-0' : '-left-64 lg:left-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-[73px] items-center justify-between border-b border-border/60 px-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand ring-1 ring-primary/30 shrink-0">
                <Wallet className="h-5 w-5 text-brand-muted" />
              </div>
              {!sidebarCollapsed && (
                <div className="hidden lg:block">
                  <p className="text-sm font-semibold text-foreground">Pennywise</p>
                  <p className="text-xs text-muted-foreground">Finance tracker</p>
                </div>
              )}
              <div className="lg:hidden">
                <p className="text-sm font-semibold text-foreground">Pennywise</p>
                <p className="text-xs text-muted-foreground">Finance tracker</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-1 py-4 ${sidebarCollapsed ? 'lg:px-2' : 'lg:px-3'} px-3`}>
            {navItems.map((item) => {
              const active = isActive(item.to);
              const buttonContent = (
                <Button
                  variant="ghost"
                  className={`w-full gap-3 ${
                    sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-start'
                  } justify-start ${
                    active
                      ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                      : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="hidden lg:inline">{item.label}</span>}
                  <span className="lg:hidden">{item.label}</span>
                </Button>
              );

              return sidebarCollapsed ? (
                <Tooltip key={item.to} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.to} onClick={() => setSidebarOpen(false)}>
                      {buttonContent}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="hidden lg:block">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
                  {buttonContent}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle button - desktop only */}
          <div className="hidden lg:flex justify-end px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 px-4 py-4">
            <div
              className={`flex items-center ${
                sidebarCollapsed ? 'lg:justify-center' : 'justify-between'
              }`}
            >
              {!sidebarCollapsed && (
                <p className="text-xs text-muted-foreground hidden lg:block">© 2025 Pennywise</p>
              )}
              <p className="text-xs text-muted-foreground lg:hidden">© 2025 Pennywise</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="flex h-[73px] items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground hidden sm:block">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative z-10 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
