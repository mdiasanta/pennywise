import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  BarChart3, 
  CreditCard, 
  Home, 
  Palette, 
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

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
];

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
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
        className={`fixed left-0 top-0 z-50 h-full w-64 transform border-r border-border/60 bg-background/95 backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Wallet className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
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
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link 
                  key={item.to} 
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 ${
                      active 
                        ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20' 
                        : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border/60 px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">© 2025 Pennywise</p>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative z-10 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
