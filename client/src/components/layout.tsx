import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  Calendar,
  User,
  LogOut,
  LayoutDashboard,
  Search,
  Clock,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import clsx from "clsx";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            HealthMate
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {user?.role === 'patient' && (
          <>

            <NavLink href="/patient-dashboard" icon={LayoutDashboard} label="Dashboard" active={location === '/patient-dashboard'} />
            <NavLink href="/find-doctors" icon={Search} label="Find Doctors" active={location === '/find-doctors'} />
            <NavLink href="/prescriptions" icon={Activity} label="Prescriptions" active={location === '/prescriptions'} /></>
        )}

        {user?.role === 'doctor' && (
          <>
            <NavLink href="/doctor-dashboard" icon={LayoutDashboard} label="Dashboard" active={location === '/doctor-dashboard'} />
            <NavLink href="/manage-availability" icon={Clock} label="My Availability" active={location === '/manage-availability'} />
            <NavLink href="/doctor-prescriptions" icon={Activity} label="Prescriptions" active={location === '/doctor-prescriptions'} /> </>
        )}
      </nav>

      <div className="p-4 border-t border-border/50 bg-muted/30">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-border bg-card shadow-lg shadow-black/5 z-10 sticky top-0 h-screen">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-border bg-card p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-lg">HealthMate</span>
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <div className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
        active
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1"
      )}>
        <Icon className={clsx("w-5 h-5", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        {label}
      </div>
    </Link>
  );
}
