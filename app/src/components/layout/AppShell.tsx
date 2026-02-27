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
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-brand-orange" />
            <span className="text-lg font-bold">StoryForge</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-card text-foreground"
                    : "text-cream-dim hover:text-foreground hover:bg-charcoal-surface"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
