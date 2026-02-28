import { Outlet, Link, useLocation } from "react-router";
import { useConvexAuth } from "convex/react";
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  Radio,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Story Board" },
  { to: "/story/new", icon: PlusCircle, label: "New Story" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function AppShell() {
  const { isAuthenticated } = useConvexAuth();
  const location = useLocation();

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="h-11 border-b border-border flex items-center px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 mr-6">
          <Radio className="h-5 w-5 text-brand-orange" />
          <span className="text-sm font-bold">StoryForge</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-card text-foreground"
                    : "text-cream-dim hover:text-foreground hover:bg-charcoal-surface"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main content — full width */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
